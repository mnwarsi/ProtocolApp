import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { ClerkProvider, SignIn, SignUp, useAuth } from "@clerk/react";
import { useEffect } from "react";
import ProtocolApp from "@/pages/ProtocolApp";
import NotFound from "@/pages/not-found";
import { useProtocolStore } from "@/store/protocolStore";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

function stripBase(path: string): string {
  if (basePath && path.startsWith(basePath)) {
    return path.slice(basePath.length) || "/";
  }
  return path;
}

const clerkAppearance = {
  variables: {
    colorPrimary: "#00f2ff",
    colorBackground: "#0a0a0a",
    colorText: "#e5e5e5",
    colorInputBackground: "#111111",
    colorInputText: "#e5e5e5",
    borderRadius: "8px",
    fontFamily: "Inter, sans-serif",
  },
  elements: {
    rootBox: { width: "100%", maxWidth: "380px" },
    card: {
      background: "#111111",
      border: "1px solid #1e1e1e",
      boxShadow: "none",
    },
  },
};

function AuthSync() {
  const { userId, isSignedIn, isLoaded } = useAuth();
  const { syncFromCloud, syncToCloud, refreshTier, setTier, setSignedInUserId } = useProtocolStore();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
      setSignedInUserId(userId);
      // Refresh tier first, then sync — sync requires Pro tier to be set
      refreshTier()
        .catch(() => setTier("free"))
        .then(() => syncFromCloud(userId))
        .then((didSync) => {
          if (!didSync) syncToCloud(userId).catch(() => {});
        })
        .catch(() => {});
    } else {
      setSignedInUserId(null);
      setTier("free");
    }
  }, [isLoaded, isSignedIn, userId]);

  return null;
}

function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/`}
        appearance={clerkAppearance}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/`}
        appearance={clerkAppearance}
      />
    </div>
  );
}

function Router() {
  return (
    <>
      <AuthSync />
      <Switch>
        <Route path="/" component={ProtocolApp} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/checkout/success">
          {() => <Redirect to="/" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function ClerkProviderWithRouter() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Router />
    </ClerkProvider>
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <WouterRouter base={basePath}>
        <Switch>
          <Route path="/" component={ProtocolApp} />
          <Route component={NotFound} />
        </Switch>
      </WouterRouter>
    );
  }

  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRouter />
    </WouterRouter>
  );
}

export default App;
