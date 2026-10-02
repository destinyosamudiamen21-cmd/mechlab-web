import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register, useAuth } from "../api/auth";

type Mode = "login" | "register";

// Only allow going back to a page inside this app. Without this check a link like
// /login?next=https://evil.example could send a student to a fake site after login.
function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "register") {
        await register({
          email: email.trim(),
          full_name: fullName.trim(),
          password,
        });
      }
      // Registering logs you straight in, so nobody has to type the password twice.
      await login(email.trim(), password);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate(next, { replace: true });
    },
  });

  // Already logged in: nothing to do here.
  if (user && !mutation.isPending) return <Navigate to={next} replace />;

  function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    mutation.mutate();
  }

  const isRegister = mode === "register";
  const otherLink = `${
    isRegister ? "/login" : "/register"
  }?next=${encodeURIComponent(next)}`;
  const errorText =
    mutation.error instanceof TypeError
      ? "Can't reach the Mech Lab server. Check your connection and try again."
      : mutation.error?.message;

  return (
    <div className='auth'>
      <h1>{isRegister ? "Create your account" : "Log in"}</h1>
      <p className='lead'>
        {isRegister
          ? "An account lets you ask questions and reply in the community."
          : "Log in to ask questions and reply in the community."}
      </p>

      <form className='panel form' onSubmit={submit}>
        {isRegister && (
          <div className='field'>
            <label htmlFor='auth-name'>Full name</label>
            <input
              id='auth-name'
              className='text-input'
              autoComplete='name'
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
        )}
        <div className='field'>
          <label htmlFor='auth-email'>Email</label>
          <input
            id='auth-email'
            className='text-input'
            type='email'
            autoComplete='email'
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className='field'>
          <label htmlFor='auth-password'>Password</label>
          <input
            id='auth-password'
            className='text-input'
            type='password'
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {isRegister && <p className='hint'>At least 8 characters.</p>}
        </div>

        {errorText && (
          <p className='form-error' role='alert'>
            {errorText}
          </p>
        )}

        <button className='button' type='submit' disabled={mutation.isPending}>
          {mutation.isPending
            ? "Please wait…"
            : isRegister
            ? "Create account"
            : "Log in"}
        </button>
      </form>

      <p className='auth-switch'>
        {isRegister ? "Already have an account? " : "New to Mech Lab? "}
        <Link to={otherLink}>
          {isRegister ? "Log in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
