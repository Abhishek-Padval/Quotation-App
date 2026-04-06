import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./src/db.ts";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // --- API Routes ---

  // Company Profile
  app.get("/api/company", (req, res) => {
    try {
      const profile = db.prepare("SELECT * FROM company_profile WHERE id = 1").get();
      res.json(profile || {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/company", (req, res) => {
    try {
      const { 
        name, tagline, address, phone, mobile, email, gst_number, 
        msme_reg, established_year, company_type, headquarters, 
        authorized_partner_since, service_locations, authorized_signatory, logo_url 
      } = req.body;
      db.prepare(`
        UPDATE company_profile 
        SET name = ?, tagline = ?, address = ?, phone = ?, mobile = ?, email = ?, gst_number = ?, 
            msme_reg = ?, established_year = ?, company_type = ?, headquarters = ?, 
            authorized_partner_since = ?, service_locations = ?, authorized_signatory = ?, logo_url = ?
        WHERE id = 1
      `).run(
        name, tagline, address, phone, mobile, email, gst_number, 
        msme_reg, established_year, company_type, headquarters, 
        authorized_partner_since, service_locations, authorized_signatory, logo_url
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Quotations
  app.get("/api/quotations", (req, res) => {
    try {
      const quotations = db.prepare("SELECT * FROM quotations ORDER BY created_at DESC").all();
      res.json(quotations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/quotations/:id", (req, res) => {
    try {
      const quotation = db.prepare("SELECT * FROM quotations WHERE id = ?").get(req.params.id);
      if (!quotation) return res.status(404).json({ error: "Not found" });
      
      const items = db.prepare("SELECT * FROM quotation_items WHERE quotation_id = ?").all(req.params.id);
      const terms = db.prepare("SELECT term_text FROM quotation_terms WHERE quotation_id = ?").all(req.params.id);
      
      const metadata = JSON.parse(quotation.metadata || '{}');
      
      res.json({ 
        ...quotation, 
        ...metadata,
        items, 
        terms: terms.map((t: any) => t.term_text) 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/quotations", (req, res) => {
    const { 
      ref_number, client_name, client_address, kind_attention, subject, 
      intro_paragraph, date, validity_days, items, terms,
      total_basic, total_gst, grand_total,
      // Metadata fields
      location, requirement_summary, proposed_solution, key_benefit, 
      delivery_timeline, warranty_period, understanding, technical_specs, amc_options
    } = req.body;

    const metadata = JSON.stringify({
      location, requirement_summary, proposed_solution, key_benefit, 
      delivery_timeline, warranty_period, understanding, technical_specs, amc_options
    });

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO quotations (
          ref_number, client_name, client_address, kind_attention, subject, 
          intro_paragraph, date, validity_days, total_basic, total_gst, grand_total, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ref_number, client_name, client_address, kind_attention, subject, 
        intro_paragraph, date, validity_days, total_basic, total_gst, grand_total, metadata
      );

      const quotationId = result.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO quotation_items (quotation_id, description, basic_price, quantity, gst_percent)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const item of items) {
        insertItem.run(quotationId, item.description, item.basic_price, item.quantity, item.gst_percent);
      }

      const insertTerm = db.prepare(`
        INSERT INTO quotation_terms (quotation_id, term_text)
        VALUES (?, ?)
      `);
      for (const term of terms) {
        insertTerm.run(quotationId, term);
      }

      return quotationId;
    });

    try {
      const id = transaction();
      res.json({ id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/quotations/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM quotations WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    try {
      const total = db.prepare("SELECT COUNT(*) as count, SUM(grand_total) as totalValue FROM quotations").get();
      const pending = db.prepare("SELECT COUNT(*) as count FROM quotations WHERE status = 'pending'").get();
      const expired = db.prepare("SELECT COUNT(*) as count FROM quotations WHERE status = 'expired'").get();
      
      res.json({
        totalQuotations: total.count || 0,
        totalValue: total.totalValue || 0,
        pendingValidity: pending.count || 0,
        expiredQuotations: expired.count || 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Auth Routes ---
  const otpStore = new Map<string, { otp: string, expires: number, type?: 'login' | 'reset' }>();

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email, type = 'login' } = req.body;
      const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (!user) return res.status(404).json({ error: "User not found" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000, type }); // 5 mins expiry

      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          await transporter.sendMail({
            from: `"Quotation Pro" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `${type === 'login' ? 'Login' : 'Password Reset'} Verification Code`,
            text: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 400px; margin: auto;">
                <h2 style="color: #4f46e5; text-align: center;">Verification Code</h2>
                <p style="text-align: center;">Your verification code for <strong>${type === 'login' ? 'Login' : 'Password Reset'}</strong> is:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5; margin: 20px 0; text-align: center; background: #f8fafc; padding: 15px; border-radius: 8px;">${otp}</div>
                <p style="color: #666; font-size: 12px; text-align: center;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
              </div>
            `,
          });
        } catch (mailErr) {
          console.error('Mail sending failed:', mailErr);
          // Still return success in debug mode if needed, but here we want it to be real
          return res.status(500).json({ error: "Failed to send email. Please check SMTP configuration." });
        }
      }

      console.log(`[OTP DEBUG] OTP for ${email} (${type}): ${otp}`);
      
      const response: any = { success: true, message: `OTP sent to ${email}` };
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        response.debugOtp = otp;
        response.message = `OTP sent (Debug Mode: ${otp})`;
      }

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const stored = otpStore.get(email);

      if (!stored || stored.otp !== otp || stored.type !== 'reset' || Date.now() > stored.expires) {
        return res.status(401).json({ error: "Invalid or expired reset code" });
      }

      otpStore.delete(email);
      db.prepare("UPDATE users SET password = ? WHERE email = ?").run(newPassword, email);
      
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    try {
      const { email, otp } = req.body;
      const stored = otpStore.get(email);

      if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
        return res.status(401).json({ error: "Invalid or expired OTP" });
      }

      otpStore.delete(email);
      const user = db.prepare("SELECT id, email, first_name, last_name, mobile, role, is_verified, permissions FROM users WHERE email = ?").get(email);
      
      if (typeof user.permissions === 'string') {
        user.permissions = JSON.parse(user.permissions);
      }

      res.json({ user, token: "mock-token-after-otp" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare("SELECT id, email, first_name, last_name, mobile, role, is_verified, permissions FROM users WHERE email = ? AND password = ?").get(email, password);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      
      // Password correct, now require OTP
      res.json({ success: true, requiresOtp: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- User Management Routes ---
  app.get("/api/users", (req, res) => {
    try {
      const users = db.prepare("SELECT id, email, first_name, last_name, mobile, role, is_verified, permissions FROM users").all();
      res.json(users.map((u: any) => ({
        ...u,
        permissions: JSON.parse(u.permissions || '[]')
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", (req, res) => {
    try {
      const { email, password, first_name, last_name, mobile, role, permissions } = req.body;
      const result = db.prepare(`
        INSERT INTO users (email, password, first_name, last_name, mobile, role, permissions, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(email, password, first_name, last_name, mobile, role, JSON.stringify(permissions || []));
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    try {
      const { role, permissions, first_name, last_name, mobile } = req.body;
      db.prepare("UPDATE users SET role = ?, permissions = ?, first_name = ?, last_name = ?, mobile = ? WHERE id = ?")
        .run(role, JSON.stringify(permissions), first_name, last_name, mobile, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Prevent deleting the last admin
      const user = db.prepare("SELECT role FROM users WHERE id = ?").get(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.role === 'admin') {
        const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
        if (adminCount <= 1) {
          return res.status(400).json({ error: "Cannot delete the last administrator" });
        }
      }
      
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Product Routes ---
  app.get("/api/products", (req, res) => {
    try {
      const products = db.prepare("SELECT * FROM products").all();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products", (req, res) => {
    try {
      const { name, description, base_price, category, version_model, key_features } = req.body;
      db.prepare("INSERT INTO products (name, description, base_price, category, version_model, key_features) VALUES (?, ?, ?, ?, ?, ?)").run(name, description, base_price, category, version_model, key_features);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Customer Routes ---
  app.get("/api/customers", (req, res) => {
    try {
      const customers = db.prepare("SELECT * FROM customers").all();
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customers", (req, res) => {
    try {
      const { name, address, billing_address, shipping_address, gst_number, contact_person, phone, email } = req.body;
      const result = db.prepare(`
        INSERT INTO customers (name, address, billing_address, shipping_address, gst_number, contact_person, phone, email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, address, billing_address, shipping_address, gst_number, contact_person, phone, email);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/customers/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- OEF Routes ---
  app.get("/api/oefs", (req, res) => {
    try {
      const oefs = db.prepare(`
        SELECT o.*, c.name as customer_name, c.address as customer_address, c.contact_person 
        FROM oefs o
        LEFT JOIN customers c ON o.customer_id = c.id
      `).all();
      res.json(oefs.map((o: any) => ({
        ...o,
        items: JSON.parse(o.items || '[]')
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/oefs", (req, res) => {
    try {
      const { oef_no, date, marketing_executive, contact, email, customer_id, items, total_amount } = req.body;
      db.prepare(`
        INSERT INTO oefs (oef_no, date, marketing_executive, contact, email, customer_id, items, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        oef_no, date, marketing_executive, contact, email, customer_id, 
        JSON.stringify(items || []), total_amount
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI PDF Parsing
  app.post("/api/ai/parse-pdf", async (req, res) => {
    const { file } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: file,
            },
          },
          {
            text: "Extract products from this PDF. Return a JSON array of objects with 'name', 'description', and 'base_price' (number). If price is not found, use 0.",
          },
        ],
        config: { responseMimeType: "application/json" }
      });
      const text = response.text?.trim() || "[]";
      res.json(JSON.parse(text));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Features
  app.post("/api/ai/generate", async (req, res) => {
    const { prompt, type } = req.body;
    try {
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: `You are a professional business assistant. Task: ${type}. Keep it professional, concise, and formal.`,
        }
      });
      const response = await model;
      res.json({ text: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Frontend build not found. Please run 'npm run build' first.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
