"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AuthSplitShell,
  itemVariants,
} from "@/components/ui/auth-split-shell";
import { FlashToast } from "@/components/ui/flash-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z
    .string()
    .min(1, { message: "Password is required." }),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormClientProps {
  loginAction: (formData: FormData) => Promise<void>;
  error: string;
  message: string;
  next: string;
}

export function LoginFormClient({
  loginAction,
  error,
  message,
  next,
}: LoginFormClientProps) {
  const [isPending, setIsPending] = React.useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = async (data: LoginValues) => {
    setIsPending(true);
    const fd = new FormData();
    fd.append("email", data.email);
    fd.append("password", data.password);
    fd.append("next", next);
    try {
      await loginAction(fd);
    } catch {
      // Server action redirects throw — this is expected
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthSplitShell
      imageSrc="/assets/images/login.jpg"
      imageAlt="Insighta login"
      imagePosition="right"
    >
      {/* Logo */}
      <motion.div variants={itemVariants} className="mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-bold tracking-wider text-blue-700">
            Insighta
          </span>
        </div>
      </motion.div>

      {/* Heading */}
      <motion.div variants={itemVariants} className="text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your Insighta account
        </p>
      </motion.div>

      {/* Flash messages */}
      <motion.div variants={itemVariants}>
        <FlashToast message={message} error={error} />
      </motion.div>

      {/* Form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Login
            </Button>
          </motion.div>
        </form>
      </Form>

      {/* Footer link */}
      <motion.p
        variants={itemVariants}
        className="px-8 text-center text-sm text-muted-foreground"
      >
        Don&apos;t have an account?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="font-medium text-blue-600 hover:underline"
        >
          Register
        </Link>
      </motion.p>
    </AuthSplitShell>
  );
}
