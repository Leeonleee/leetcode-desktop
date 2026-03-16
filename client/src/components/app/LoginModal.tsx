import { FormEvent } from "react";
import { X } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Domain } from "../../types/app";

type LoginModalProps = {
  isOpen: boolean;
  domain: Domain;
  onDomainChange: (domain: Domain) => void;
  cookie: string;
  onCookieChange: (value: string) => void;
  errorMessage: string;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onExit: () => void;
};

export const LoginModal = ({
  isOpen,
  domain,
  onDomainChange,
  cookie,
  onCookieChange,
  errorMessage,
  isSubmitting,
  onSubmit,
  onClose,
  onExit
}: LoginModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
      <Card className="w-full max-w-xl border-border/90 bg-card shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-2xl">Login</CardTitle>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close login modal">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <CardDescription>Select the domain and paste your cookie header.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>Domain</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={domain === "com" ? "default" : "outline"} onClick={() => onDomainChange("com")}>
                  leetcode.com
                </Button>
                <Button type="button" variant={domain === "cn" ? "default" : "outline"} onClick={() => onDomainChange("cn")}>
                  leetcode.cn
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookie">Cookie Header</Label>
              <Textarea
                id="cookie"
                value={cookie}
                onChange={(event) => onCookieChange(event.target.value)}
                placeholder="csrftoken=...; LEETCODE_SESSION=...; ..."
                rows={8}
              />
            </div>

            {errorMessage ? (
              <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground/90">{errorMessage}</div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="w-full sm:flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:flex-1"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="button" variant="ghost" onClick={onExit}>
            Exit app
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
