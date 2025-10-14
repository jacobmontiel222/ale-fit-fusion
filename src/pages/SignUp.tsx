import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    // TODO: Implement Supabase authentication
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8">
      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <button 
          onClick={() => navigate("/login")}
          className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Header */}
      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-3">
          Create Account
        </h1>
        <p className="text-muted-foreground text-lg">
          Start your fitness journey today.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignUp} className="w-full max-w-md space-y-4">
        {/* Email Input */}
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        {/* Password Input */}
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        {/* Confirm Password Input */}
        <Input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        {/* Sign Up Button */}
        <Button
          type="submit"
          className="w-full h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-2xl text-base mt-6"
        >
          Sign Up
        </Button>

        {/* Already have account */}
        <div className="text-center mt-4">
          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-[#007AFF] hover:underline font-medium"
            >
              Log In
            </button>
          </p>
        </div>
      </form>

      {/* Footer */}
      <div className="w-full max-w-md mt-8 text-center">
        <p className="text-muted-foreground text-xs leading-relaxed">
          By continuing, you agree to our{" "}
          <button 
            onClick={() => window.open("/terms", "_blank")}
            className="text-foreground hover:underline"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button 
            onClick={() => window.open("/privacy", "_blank")}
            className="text-foreground hover:underline"
          >
            Privacy Policy
          </button>
          .
        </p>
      </div>
    </div>
  );
};

export default SignUp;
