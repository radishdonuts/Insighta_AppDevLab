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

const registerSchema = z
  .object({
    firstName: z.string().min(1, { message: "First name is required." }),
    lastName: z.string().min(1, { message: "Last name is required." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

interface RegisterFormClientProps {
  registerAction: (formData: FormData) => Promise<void>;
  error: string;
  message: string;
  next: string;
}

export function RegisterFormClient({
  registerAction,
  error,
  message,
  next,
}: RegisterFormClientProps) {
  const [isPending, setIsPending] = React.useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: RegisterValues) => {
    setIsPending(true);
    const fd = new FormData();
    fd.append("firstName", data.firstName);
    fd.append("lastName", data.lastName);
    fd.append("email", data.email);
    fd.append("password", data.password);
    fd.append("confirmPassword", data.confirmPassword);
    fd.append("next", next);
    try {
      await registerAction(fd);
    } catch {
      // Server action redirects throw — this is expected
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthSplitShell
      imageSrc="/assets/images/register.jpg"
      imageAlt="Insighta register"
      imagePosition="left"
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
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Get started with Insighta today
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
          {/* First / Last name row */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-4"
          >
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Juan"
                      autoComplete="given-name"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Dela Cruz"
                      autoComplete="family-name"
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
                      autoComplete="new-password"
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
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
              Create account
            </Button>
          </motion.div>
        </form>
      </Form>

      {/* Footer link */}
      <motion.p
        variants={itemVariants}
        className="px-8 text-center text-sm text-muted-foreground"
      >
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-medium text-blue-600 hover:underline"
        >
          Sign in
        </Link>
      </motion.p>
    </AuthSplitShell>
  );
}
