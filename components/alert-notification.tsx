// components/alert-notification.tsx
'use client';

import { useState, useEffect } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Message } from "@/components/form-message";

export function AlertNotification({ message }: { message: Message }) {
  const [isVisible, setIsVisible] = useState(true);
  const isError = "error" in message;
  const isSuccess = "success" in message;
  const messageText = isError ? message.error : isSuccess ? message.success : message.message;

  useEffect(() => {
    // Auto-hide the alert after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <Alert 
      className={`mb-6 animate-in fade-in slide-in-from-top duration-300 ${
        isError ? "border-red-500 bg-red-50 text-red-900" : 
        isSuccess ? "border-green-500 bg-green-50 text-green-900" :
        "border-blue-500 bg-blue-50 text-blue-900"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-5 w-5 text-red-500" />
      ) : isSuccess ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <AlertCircle className="h-5 w-5 text-blue-500" />
      )}
      <AlertTitle className="ml-2 text-base font-medium">
        {isError ? "Error" : isSuccess ? "Success" : "Info"}
      </AlertTitle>
      <AlertDescription className="ml-2 text-sm">
        {messageText}
      </AlertDescription>
    </Alert>
  );
}