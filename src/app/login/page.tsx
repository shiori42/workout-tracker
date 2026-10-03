"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cloudEnabled, getSupabase, requireLogin, useCloud } from "@/lib/supabase";
import { Button, Card, Field, Input, PageHeader, Segmented } from "@/components/ui";
import { toast } from "@/lib/toast";
import { useApp } from "@/lib/store";

const googleEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";

export default function LoginPage() {
  const router = useRouter();
  const user = useCloud((s) => s.user);
  const status = useCloud((s) => s.status);
  const onboarded = useApp((s) => s.settings.onboarded);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

  if (!cloudEnabled) {
    return (
      <div>
        <PageHeader title="ログイン" back />
        <div className="px-4 pt-4">
          <Card>
            <p className="text-sm text-muted">
              クラウド保存は現在無効です。サーバーに Supabase の接続情報（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）を設定すると利用できます。
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (user) {
    const syncing = status === "syncing";
    return (
      <div>
        <PageHeader title="アカウント" back />
        <div className="space-y-3 px-4 pt-4">
          <Card>
            <div className="text-center">
              <div className={syncing ? "text-4xl animate-pulse" : "text-4xl"}>☁️</div>
              <div className="mt-2 font-bold">{syncing ? "データを同期しています…" : "ログイン中"}</div>
              <div className="text-sm text-muted">{user.email}</div>
            </div>
          </Card>
          {onboarded ? (
            <Button size="lg" className="w-full" disabled={syncing} onClick={() => router.replace("/")}>
              ホームへ
            </Button>
          ) : (
            <>
              {!syncing && (
                <p className="text-center text-xs text-muted">クラウドに保存済みのデータはありませんでした。初期設定を続けてください。</p>
              )}
              <Button size="lg" className="w-full" disabled={syncing} onClick={() => router.replace("/onboarding")}>
                初期設定へ
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  const submit = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast("ログインしました", "データを同期しています", "☁️");
        if (useApp.getState().settings.onboarded) router.replace("/");
      } else {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        if (data.session) {
          toast("アカウントを作成しました", "データをクラウドに保存します", "☁️");
          router.replace(useApp.getState().settings.onboarded ? "/" : "/onboarding");
        } else {
          setMessage("確認メールを送信しました。メール内のリンクを開いてログインを完了してください。");
        }
      }
    } catch (e) {
      setMessage(translate(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const magicLink = async () => {
    const sb = getSupabase();
    if (!sb || !email) return;
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: !requireLogin },
    });
    setBusy(false);
    setMessage(error ? translate(error.message) : "ログイン用リンクをメールで送信しました。");
  };

  const google = async () => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  };

  return (
    <div>
      <PageHeader title="ログイン" back={requireLogin ? undefined : true} />
      <div className="space-y-4 px-4 pt-4">
        <div className="text-center">
          <div className="text-4xl">{requireLogin ? "💪" : "☁️"}</div>
          <p className="mt-2 text-sm text-muted">
            {requireLogin
              ? "このアプリは登録済みのアカウントでのみ利用できます。"
              : "ログインすると記録がクラウドに保存され、別の端末からも参照できます。"}
          </p>
        </div>
        {!requireLogin && (
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "signin", label: "ログイン" },
              { value: "signup", label: "新規登録" },
            ]}
          />
        )}
        <Card>
          <div className="space-y-4">
            <Field label="メールアドレス">
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="パスワード" hint={mode === "signup" ? "6文字以上" : undefined}>
              <Input
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </Field>
            <Button size="lg" className="w-full" disabled={busy || !email || password.length < 6} onClick={submit}>
              {busy ? "処理中..." : mode === "signin" ? "ログイン" : "アカウントを作成"}
            </Button>
            {mode === "signin" && (
              <Button variant="secondary" className="w-full" disabled={busy || !email} onClick={magicLink}>
                パスワードなしでログイン（メールリンク）
              </Button>
            )}
            {googleEnabled && (
              <Button variant="secondary" className="w-full" onClick={google}>
                Googleでログイン
              </Button>
            )}
          </div>
        </Card>
        {message && <p className="rounded-xl bg-card px-4 py-3 text-sm text-white/90">{message}</p>}
        <p className="text-center text-[11px] text-muted">🔒 身体写真・身体情報は本人のみが閲覧できるよう保護されます。</p>
      </div>
    </div>
  );
}

function translate(msg: string) {
  if (/Invalid login credentials/i.test(msg)) return "メールアドレスまたはパスワードが正しくありません。";
  if (/already registered/i.test(msg)) return "このメールアドレスは既に登録されています。";
  if (/signups? not allowed/i.test(msg)) return "このメールアドレスは登録されていません。";
  if (/Password should be/i.test(msg)) return "パスワードは6文字以上にしてください。";
  if (/rate limit/i.test(msg)) return "しばらく時間をおいてから再度お試しください。";
  return msg;
}
