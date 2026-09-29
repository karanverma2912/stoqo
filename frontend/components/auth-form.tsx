"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, Boxes, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
const schema = z.object({
  name: z.string().optional(),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(12, "Use at least 12 characters")
    .max(72, "Use no more than 72 characters"),
});
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(
      signup
        ? schema
        : schema.extend({ password: z.string().min(1, "Enter your password") }),
    ),
  });
  async function submit(values: z.infer<typeof schema>) {
    setError("");
    try {
      await api(`auth/${signup ? "signup" : "login"}`, {
        method: "POST",
        body: JSON.stringify(signup ? { user: values } : values),
      });
      router.push(sessionStorage.getItem("stoqo_invitation") ? "/join" : "/app");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="auth-page">
      <Link href="/" className="wordmark">
        <span className="brand-mark">
          <Boxes />
        </span>
        stoqo.
      </Link>
      <div className="auth-card">
        <span className="eyebrow">
          {signup ? "A FRESH START FOR YOUR SHELVES" : "GOOD TO HAVE YOU BACK"}
        </span>
        <h1>
          {signup ? "Small business.\nBig possibilities." : "Welcome back."}
        </h1>
        <p className="muted">
          {signup
            ? "Let’s make stock one less thing to worry about."
            : "Your business is right where you left it."}
        </p>
        <form onSubmit={form.handleSubmit(submit)}>
          {signup && (
            <label>
              Your name
              <input autoComplete="name" required {...form.register("name")} />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              {...form.register("email")}
            />
            <small className="field-error">
              {form.formState.errors.email?.message}
            </small>
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              {...form.register("password")}
            />
            <small className="field-error">
              {form.formState.errors.password?.message}
            </small>
          </label>
          {error && (
            <p role="alert" className="error-box">
              {error}
            </p>
          )}
          <button
            className="button primary full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <LoaderCircle className="spin" size={18} />
            ) : signup ? (
              "Create your account"
            ) : (
              "Log in"
            )}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {signup ? "Already have an account?" : "New around here?"}{" "}
          <Link href={signup ? "/login" : "/signup"}>
            {signup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
      <p className="auth-foot">
        A little less stock stress. A little more you.
      </p>
    </main>
  );
}
