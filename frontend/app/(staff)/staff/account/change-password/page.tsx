import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function StaffChangePasswordPage() {
  return (
    <ChangePasswordForm
      title="Change Password"
      description="Update the password for your staff account."
      backHref="/staff"
      backLabel="Back to Work Tickets"
    />
  );
}
