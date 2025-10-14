import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resendVerification, user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Get email from location state or user
    const emailFromState = location.state?.email;
    const emailFromUser = user?.email;
    setEmail(emailFromState || emailFromUser || "");
  }, [location.state, user]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!email) return;
    
    setIsResending(true);
    const { error } = await resendVerification(email);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email enviado",
        description: "Hemos reenviado el enlace de verificación.",
      });
      setCountdown(60);
    }
    
    setIsResending(false);
  };

  const handleCheckVerification = () => {
    // In auto-confirm mode, user should already be logged in
    // This is just for UI completeness
    navigate("/");
  };

  const handleOpenMail = () => {
    window.open("mailto:");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8">
      {/* Icon */}
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Mail className="w-12 h-12 text-primary" />
      </div>

      {/* Header */}
      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-3">
          Verify your email
        </h1>
        <p className="text-muted-foreground text-lg">
          We've sent a verification link to
        </p>
        <p className="text-foreground font-medium mt-2 mb-4">
          {email}
        </p>
        <p className="text-muted-foreground text-sm">
          Please check your inbox and click the link to verify your account.
        </p>
      </div>

      {/* Buttons */}
      <div className="w-full max-w-md space-y-4">
        <Button
          onClick={handleOpenMail}
          className="w-full h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-2xl text-base"
        >
          <Mail className="w-5 h-5 mr-2" />
          Open Mail App
        </Button>

        <Button
          onClick={handleResendEmail}
          disabled={countdown > 0 || isResending}
          className="w-full h-14 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-2xl text-base"
        >
          {countdown > 0 
            ? `Resend email (${countdown}s)` 
            : isResending 
            ? "Sending..." 
            : "Resend email"}
        </Button>

        <Button
          onClick={handleCheckVerification}
          className="w-full h-14 bg-[#1C1F26] hover:bg-[#2A2D35] text-white font-semibold rounded-2xl text-base"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          I've verified
        </Button>
      </div>

      {/* Tips */}
      <div className="w-full max-w-md mt-8 p-4 bg-secondary rounded-2xl">
        <p className="text-sm text-muted-foreground mb-2">
          <strong className="text-foreground">Can't find the email?</strong>
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Check your spam or junk folder</li>
          <li>Make sure you entered the correct email</li>
          <li>Wait a few minutes and try resending</li>
          <li>Check that {email} is accessible</li>
        </ul>
      </div>
    </div>
  );
};

export default VerifyEmail;
