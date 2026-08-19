import Image from "next/image";
import LoginForm from "../../components/LoginForm";

export const metadata = { title: "Secure sign in" };

export default function AdminLogin() {
  return <main className="admin-login"><div className="login-glow" /><section className="login-card glass"><Image src="/brand/ghostie-icon.png" alt="" width={66} height={66} priority /><p className="section-kicker">Private workspace</p><h1>ScareSafe Admin</h1><p>Sign in with an account assigned the admin role.</p><LoginForm /></section></main>;
}
