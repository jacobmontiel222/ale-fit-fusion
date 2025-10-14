import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setIsLoading(true);
    const { error } = await resetPassword(email);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEmailSent(true);
      toast({
        title: "Email enviado",
        description: "Si existe una cuenta con este email, recibirás un enlace de recuperación.",
      });
    }
    
    setIsLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Mail className="w-12 h-12 text-primary" />
        </div>

        {/* Header */}
        <div className="w-full max-w-md mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Check your email
          </h1>
          <p className="text-muted-foreground text-lg">
            If an account exists for {email}, you will receive a password reset link.
          </p>
        </div>

        {/* Back to login button */}
        <Button
          onClick={() => navigate("/login")}
          className="w-full max-w-md h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-2xl text-base"
        >
          Back to Login
        </Button>

        {/* Tips */}
        <div className="w-full max-w-md mt-8 p-4 bg-secondary rounded-2xl">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Didn't receive the email?</strong>
            <br />
            Check your spam folder or try resending the link.
          </p>
        </div>
      </div>
    );
  }

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
          Reset Password
        </h1>
        <p className="text-muted-foreground text-lg">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleResetPassword} className="w-full max-w-md space-y-4">
        {/* Email Input */}
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        {/* Send Reset Link Button */}
        <Button
          type="submit"
          disabled={isLoading || !email}
          className="w-full h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-2xl text-base mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send reset link"}
        </Button>

        {/* Back to login */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-[#007AFF] hover:underline font-medium text-sm"
          >
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword;
