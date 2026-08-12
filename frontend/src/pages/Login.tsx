import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-navy">Ordering System</h1>
        <p className="mb-6 mt-2 text-sm text-gray-500">Sign in with your Google account.</p>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (!credentialResponse.credential) return;
              try {
                await loginWithGoogle(credentialResponse.credential);
                navigate("/orders", { replace: true });
              } catch {
                setError("Sign-in failed. Ask a Partner to confirm you've been invited with this email.");
              }
            }}
            onError={() => setError("Google sign-in failed. Please try again.")}
          />
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
