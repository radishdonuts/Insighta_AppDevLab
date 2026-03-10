import { registerAction } from "@/app/(guest)/register/action";
import { RegisterFormClient } from "./register-form-client";

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const error = readParam(searchParams?.error);
  const message = readParam(searchParams?.message);
  const next = readParam(searchParams?.next) || "/";

  return (
    <RegisterFormClient
      registerAction={registerAction}
      error={error}
      message={message}
      next={next}
    />
  );
}
