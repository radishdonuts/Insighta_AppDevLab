import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function CustomerChangePasswordPage() {
  return (
    <ChangePasswordForm
      title="Change Password"
      description="Update the password for your customer account."
      backHref="/tickets"
      backLabel="Back to My Tickets"
    />
  );
}
