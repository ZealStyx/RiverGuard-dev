"use client";
import {
  multiFactor,
  TotpMultiFactorGenerator,
  type TotpSecret,
} from "firebase/auth";
import { useState } from "react";
import Link from "next/link";
import { useFirebaseAuth } from "./FirebaseAuthProvider";
import { Button } from "@/components/ui";
import { TextField } from "../prototype/Primitives";
export function MfaSetup() {
  const { user } = useFirebaseAuth();
  return user?.emailVerified ? (
    <Enrollment key={user.uid} />
  ) : (
    <Link href="/auth/login">Sign in with a verified email to manage MFA.</Link>
  );
}
function Enrollment() {
  const { user } = useFirebaseAuth();
  const [secret, setSecret] = useState<TotpSecret | null>(null),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  if (!user) return null;
  const factor = multiFactor(user);
  if (factor.enrolledFactors.some((f) => f.factorId === "totp"))
    return (
      <p>
        Authenticator app enrolled. Firebase will challenge future sign-ins.
      </p>
    );
  async function submit() {
    setBusy(true);
    try {
      if (!secret)
        setSecret(
          await TotpMultiFactorGenerator.generateSecret(
            await factor.getSession(),
          ),
        );
      else {
        await factor.enroll(
          TotpMultiFactorGenerator.assertionForEnrollment(secret, code),
          "Authenticator app",
        );
        setSecret(null);
        setCode("");
      }
      setMessage("");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Enrollment failed. Sign in again and retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-3">
      <p>
        Add a time-based code from your authenticator app to future sign-ins.
      </p>
      {secret && (
        <>
          <p>
            Enter this setup key in your authenticator:{" "}
            <code>{secret.secretKey}</code>
          </p>
          <TextField
            id="totp"
            label="Authenticator code"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </>
      )}
      <Button loading={busy} onClick={submit}>
        {secret ? "Verify and enroll" : "Set up authenticator app"}
      </Button>
      <p role="status">{message}</p>
    </div>
  );
}
