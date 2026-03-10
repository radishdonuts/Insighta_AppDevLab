import { loginAction } from "@/app/(guest)/login/action";
import { LoginFormClient } from "./login-form-client";

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const error = readParam(searchParams?.error);
  const message = readParam(searchParams?.message);
  const next = readParam(searchParams?.next) || "/";
  const email = readParam(searchParams?.email);

  return (
    <LoginFormClient
      loginAction={loginAction}
      error={error}
      message={message}
      next={next}
      defaultEmail={email}
    />
  );
}
