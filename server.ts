import express from "express";
import { createServer as createViteServer } from "vite";
import { supabase } from "./src/supabase.ts";
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
  app.get("/api/company", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("company_profile")
        .select("*")
        .eq("id", 1)
        .single();
      
      if (error) throw error;
      res.json(data || {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/company", async (req, res) => {
    try {
      const { 
        name, tagline, address, phone, mobile, email, gst_number, 
        msme_reg, established_year, company_type, headquarters, 
        authorized_partner_since, service_locations, authorized_signatory, logo_url 
      } = req.body;
      
      const { error } = await supabase
        .from("company_profile")
        .update({ 
          name, tagline, address, phone, mobile, email, gst_number, 
          msme_reg, established_year, company_type, headquarters, 
          authorized_partner_since, service_locations, authorized_signatory, logo_url 
        })
        .eq("id", 1);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Quotations
  app.get("/api/quotations", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/quotations/:id", async (req, res) => {
    try {
      const { data: quotation, error: qError } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", req.params.id)
        .single();
      
      if (qError || !quotation) return res.status(404).json({ error: "Not found" });
      
      const { data: items, error: iError } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", req.params.id);
      
      const { data: terms, error: tError } = await supabase
        .from("quotation_terms")
        .select("term_text")
        .eq("quotation_id", req.params.id);
      
      if (iError || tError) throw iError || tError;
      
      // Supabase might return metadata as an object if it's JSONB, or a string if it's TEXT
      const metadata = typeof quotation.metadata === 'string' 
        ? JSON.parse(quotation.metadata || '{}') 
        : (quotation.metadata || {});
      
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

  app.post("/api/quotations", async (req, res) => {
    const { 
      ref_number, client_name, client_address, kind_attention, subject, 
      intro_paragraph, date, validity_days, items, terms,
      total_basic, total_gst, grand_total,
      // Metadata fields
      location, requirement_summary, proposed_solution, key_benefit, 
      delivery_timeline, warranty_period, understanding, technical_specs, amc_options
    } = req.body;

    const metadata = {
      location, requirement_summary, proposed_solution, key_benefit, 
      delivery_timeline, warranty_period, understanding, technical_specs, amc_options
    };

    try {
      // Create Quotation
      const { data: qData, error: qError } = await supabase
        .from("quotations")
        .insert({
          ref_number, client_name, client_address, kind_attention, subject, 
          intro_paragraph, date, validity_days, total_basic, total_gst, grand_total, metadata
        })
        .select("id")
        .single();

      if (qError) throw qError;
      const quotationId = qData.id;

      // Create Items
      const itemsToInsert = items.map((item: any) => ({
        quotation_id: quotationId,
        description: item.description,
        basic_price: item.basic_price,
        quantity: item.quantity,
        gst_percent: item.gst_percent
      }));
      const { error: iError } = await supabase.from("quotation_items").insert(itemsToInsert);
      if (iError) throw iError;

      // Create Terms
      const termsToInsert = terms.map((term: string) => ({
        quotation_id: quotationId,
        term_text: term
      }));
      const { error: tError } = await supabase.from("quotation_terms").insert(termsToInsert);
      if (tError) throw tError;

      res.json({ id: quotationId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/quotations/:id", async (req, res) => {
    try {
      const { error } = await supabase.from("quotations").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const { data: total, error: tError } = await supabase
        .from("quotations")
        .select("id, grand_total");
      
      const { count: pendingCount, error: pError } = await supabase
        .from("quotations")
        .select("*", { count: 'exact', head: true })
        .eq("status", "pending");
      
      const { count: expiredCount, error: eError } = await supabase
        .from("quotations")
        .select("*", { count: 'exact', head: true })
        .eq("status", "expired");
      
      if (tError || pError || eError) throw tError || pError || eError;

      const totalValue = total?.reduce((sum, q) => sum + (q.grand_total || 0), 0) || 0;
      
      res.json({
        totalQuotations: total?.length || 0,
        totalValue,
        pendingValidity: pendingCount || 0,
        expiredQuotations: expiredCount || 0
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
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();
      
      if (error || !user) return res.status(404).json({ error: "User not found" });

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

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const stored = otpStore.get(email);

      if (!stored || stored.otp !== otp || stored.type !== 'reset' || Date.now() > stored.expires) {
        return res.status(401).json({ error: "Invalid or expired reset code" });
      }

      otpStore.delete(email);
      const { error } = await supabase
        .from("users")
        .update({ password: newPassword })
        .eq("email", email);
      
      if (error) throw error;
      
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      const stored = otpStore.get(email);

      if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
        return res.status(401).json({ error: "Invalid or expired OTP" });
      }

      otpStore.delete(email);
      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, first_name, last_name, mobile, role, is_verified, permissions")
        .eq("email", email)
        .single();
      
      if (error || !user) throw error || new Error("User not found");
      
      if (typeof user.permissions === 'string') {
        user.permissions = JSON.parse(user.permissions);
      }

      res.json({ user, token: "mock-token-after-otp" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .eq("password", password)
        .single();
      
      if (error || !user) return res.status(401).json({ error: "Invalid credentials" });
      
      // Password correct, now require OTP
      res.json({ success: true, requiresOtp: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- User Management Routes ---
  app.get("/api/users", async (req, res) => {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, email, first_name, last_name, mobile, role, is_verified, permissions");
      
      if (error) throw error;
      res.json(users.map((u: any) => ({
        ...u,
        permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions || '[]') : (u.permissions || [])
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { email, password, first_name, last_name, mobile, role, permissions } = req.body;
      const { data, error } = await supabase
        .from("users")
        .insert({ 
          email, password, first_name, last_name, mobile, role, 
          permissions: permissions || [], 
          is_verified: true 
        })
        .select("id")
        .single();
      
      if (error) throw error;
      res.json({ success: true, id: data.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { role, permissions, first_name, last_name, mobile } = req.body;
      const { error } = await supabase
        .from("users")
        .update({ role, permissions, first_name, last_name, mobile })
        .eq("id", req.params.id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = req.params.id;

      // Prevent deleting the last admin
      const { data: user, error: uError } = await supabase
        .from("users")
        .select("role")
        .eq("id", id)
        .single();
      
      if (uError || !user) return res.status(404).json({ error: "User not found" });

      if (user.role === 'admin') {
        const { count, error: cError } = await supabase
          .from("users")
          .select("*", { count: 'exact', head: true })
          .eq("role", "admin");
        
        if (cError) throw cError;
        if (count && count <= 1) {
          return res.status(400).json({ error: "Cannot delete the last administrator" });
        }
      }
      
      const { error: dError } = await supabase.from("users").delete().eq("id", id);
      if (dError) throw dError;
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Product Routes ---
  app.get("/api/products", async (req, res) => {
    try {
      const { data: products, error } = await supabase.from("products").select("*");
      if (error) throw error;
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { name, description, base_price, category, version_model, key_features } = req.body;
      const { error } = await supabase
        .from("products")
        .insert({ name, description, base_price, category, version_model, key_features });
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Customer Routes ---
  app.get("/api/customers", async (req, res) => {
    try {
      const { data: customers, error } = await supabase.from("customers").select("*");
      if (error) throw error;
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const { name, address, billing_address, shipping_address, gst_number, contact_person, phone, email } = req.body;
      const { data, error } = await supabase
        .from("customers")
        .insert({ name, address, billing_address, shipping_address, gst_number, contact_person, phone, email })
        .select("id")
        .single();
      
      if (error) throw error;
      res.json({ success: true, id: data.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const { error } = await supabase.from("customers").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- OEF Routes ---
  app.get("/api/oefs", async (req, res) => {
    try {
      const { data: oefs, error } = await supabase
        .from("oefs")
        .select(`
          *,
          customers (
            name,
            address,
            contact_person
          )
        `);
      
      if (error) throw error;
      
      res.json(oefs.map((o: any) => ({
        ...o,
        customer_name: o.customers?.name,
        customer_address: o.customers?.address,
        contact_person: o.customers?.contact_person,
        items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || [])
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/oefs", async (req, res) => {
    try {
      const { oef_no, date, marketing_executive, contact, email, customer_id, items, total_amount } = req.body;
      const { error } = await supabase
        .from("oefs")
        .insert({
          oef_no, date, marketing_executive, contact, email, customer_id, 
          items: items || [], 
          total_amount
        });
      
      if (error) throw error;
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
