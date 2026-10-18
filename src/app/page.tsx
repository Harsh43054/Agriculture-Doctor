"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CloudSun,
  Droplets,
  FlaskConical,
  History,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  LogOut,
  MapPin,
  Plus,
  ScanLine,
  Search,
  ShieldCheck,
  Sprout,
  Sun,
  Thermometer,
  Upload,
  Wind,
  X,
} from "lucide-react";
import { browserSupabase } from "@/lib/browser";
import type { Scan, Soil } from "@/lib/validation";
import { weatherAdvice, weatherLabel, type Weather } from "@/lib/weather";

type View =
  "Overview" | "Plant doctor" | "Scan history" | "Soil journal" | "Weather";
type Location = {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
};
const nav = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Plant doctor", icon: ScanLine },
  { name: "Scan history", icon: History },
  { name: "Soil journal", icon: Sprout },
  { name: "Weather", icon: CloudSun },
] as const;
const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<
    "signin" | "signup" | "reset" | "update"
  >("signin");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [scans, setScans] = useState<Scan[]>([]);
  const [soil, setSoil] = useState<Soil[]>([]);
  const [dataBusy, setDataBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [field, setField] = useState("My field");
  const [crop, setCrop] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [selected, setSelected] = useState<Scan | null>(null);
  const [soilBusy, setSoilBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const identity = useRef<string | null>(null);
  const weatherRequest = useRef(0);

  useEffect(() => {
    if (!authOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.querySelector<HTMLElement>('input, button')?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setAuthOpen(false); return; }
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]'));
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [authOpen]);

  useEffect(() => {
    const client = browserSupabase();
    setConfigured(Boolean(client));
    if (!client) return;
    let live = true;
    client.auth.getSession().then(({ data }) => {
      if (live) setSession(data.session);
    });
    const { data } = client.auth.onAuthStateChange((event, value) => {
      setSession(value);
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("update");
        setAuthOpen(true);
      }
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    identity.current = session?.user.id || null;
    setScans([]);
    setSoil([]);
    setSelected(null);
    setError("");
    if (!session) return;
    let live = true;
    setDataBusy(true);
    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.all([
      fetch("/api/scans", { headers }),
      fetch("/api/soil", { headers }),
    ])
      .then(async ([a, b]) => {
        const [scanData, soilData] = await Promise.all([a.json(), b.json()]);
        if (!live) return;
        if (!a.ok || !b.ok) throw new Error(scanData.error || soilData.error);
        setScans(scanData.scans);
        setSoil(soilData.readings);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setDataBusy(false);
      });
    return () => {
      live = false;
    };
  }, [session?.user.id, session?.access_token]);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("agriculture-location") || "null",
      );
      if (
        stored &&
        typeof stored.name === "string" &&
        Number.isFinite(stored.latitude) &&
        Number.isFinite(stored.longitude)
      )
        setLocation(stored);
    } catch {
      /* A location is optional. */
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    let live = true;
    setWeatherBusy(true);
    setWeatherError("");
    fetch(`/api/weather?lat=${location.latitude}&lon=${location.longitude}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        if (live) setWeather(data);
      })
      .catch((e) => {
        if (live) setWeatherError(e.message);
      })
      .finally(() => {
        if (live) setWeatherBusy(false);
      });
    try {
      localStorage.setItem("agriculture-location", JSON.stringify(location));
    } catch {
      /* Storage can be disabled. */
    }
    return () => {
      live = false;
    };
  }, [location]);

  function chooseFile(value?: File) {
    if (!value) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(value.type)) {
      setError("Please choose a JPG, PNG, or WebP photograph.");
      return;
    }
    if (value.size > 3 * 1024 * 1024) {
      setError("Choose a photograph smaller than 3 MB.");
      return;
    }
    setFile(value);
    setSelected(null);
  }

  async function authorizedFetch(url: string, options: RequestInit = {}) {
    const client = browserSupabase();
    const { data } = client
      ? await client.auth.getSession()
      : { data: { session: null } };
    if (!data.session) {
      setAuthOpen(true);
      throw new Error("Sign in to save your field records.");
    }
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Please try again.");
    return result;
  }

  async function runScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!file) {
      setError("Choose a clear photograph of your plant first.");
      return;
    }
    if (!session) {
      setAuthOpen(true);
      return;
    }
    const userId = session.user.id;
    const form = new FormData();
    form.set("image", file);
    form.set("field", field);
    form.set("crop_hint", crop);
    setScanBusy(true);
    try {
      const { scan } = await authorizedFetch("/api/scans", {
        method: "POST",
        body: form,
      });
      if (identity.current !== userId) return;
      setScans((current) => [scan, ...current]);
      setSelected(scan);
      setNotice("Assessment saved to your private scan history.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanBusy(false);
    }
  }

  async function saveSoil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!session) {
      setAuthOpen(true);
      return;
    }
    const element = event.currentTarget;
    const form = new FormData(element);
    const userId = session.user.id;
    setSoilBusy(true);
    try {
      const body = {
        field: form.get("field"),
        moisture: Number(form.get("moisture")),
        ph: Number(form.get("ph")),
        temperature: Number(form.get("temperature")),
        notes: form.get("notes"),
      };
      const { reading } = await authorizedFetch("/api/soil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (identity.current !== userId) return;
      setSoil((current) => [reading, ...current]);
      element.reset();
      setNotice("Soil reading saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSoilBusy(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    const client = browserSupabase();
    if (!client) {
      setAuthMessage("Supabase setup is required before you can sign in.");
      setAuthBusy(false);
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    try {
      if (authMode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setAuthMessage("Check your email for a password reset link.");
      } else if (authMode === "update") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setAuthOpen(false);
        setNotice("Password updated.");
      } else if (authMode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) setAuthOpen(false);
        else
          setAuthMessage(
            "Check your email to confirm your account, then sign in.",
          );
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setAuthOpen(false);
      }
    } catch (e) {
      setAuthMessage((e as Error).message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function searchLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = ++weatherRequest.current;
    setWeatherBusy(true);
    setWeatherError("");
    try {
      const response = await fetch(
        `/api/weather?city=${encodeURIComponent(query)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (requestId !== weatherRequest.current) return;
      setLocations(data.locations);
      if (!data.locations.length)
        setWeatherError("No locations found. Try a nearby town or city.");
    } catch (e) {
      setWeatherError((e as Error).message);
    } finally {
      if (requestId === weatherRequest.current) setWeatherBusy(false);
    }
  }

  function exportRecords() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            scans: scans.map(({ imageUrl: _url, ...scan }) => scan),
            soil_readings: soil,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agriculture-doctor-records.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const latestSoil = soil[0];
  const recentScans = scans.filter((scan) =>
    `${scan.field} ${scan.result.crop} ${scan.result.condition}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const attention = scans.filter((scan) =>
    ["moderate", "high"].includes(scan.result.severity),
  ).length;
  const changeView = (value: View) => {
    setView(value);
    setError("");
    setNotice("");
  };

  const scanForm = (
    <form className="panel scan-panel" onSubmit={runScan}>
      <div className="panel-title">
        <div>
          <span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</span>
          <h2>How is your plant doing?</h2>
        </div>
        <span className="icon-box">
          <ScanLine size={22} />
        </span>
      </div>
      <input
        ref={input}
        id="plant-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => chooseFile(e.target.files?.[0])}
      />
      <label
        htmlFor="plant-photo"
        className={`dropzone ${preview ? "with-preview" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          chooseFile(e.dataTransfer.files[0]);
        }}
      >
        {preview ? (
          <img src={preview} alt="Your selected plant photograph" />
        ) : (
          <>
            <span className="upload-icon">
              <Upload size={25} />
            </span>
            <strong>Drop a leaf photo here</strong>
            <span>
              or <u>browse your files</u>
            </span>
            <small>JPG, PNG or WebP · up to 3 MB</small>
          </>
        )}
        {preview && (
          <span className="replace-photo">Choose a different photo</span>
        )}
      </label>
      <div className="form-row">
        <label>
          Field name
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            maxLength={80}
            required
            placeholder="e.g. North field"
          />
        </label>
        <label>
          Crop <span className="muted">(optional)</span>
          <input
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            maxLength={80}
            placeholder="e.g. Tomato"
          />
        </label>
      </div>
      <button className="primary wide" disabled={scanBusy} type="submit">
        {scanBusy ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <ScanLine size={18} />
        )}{" "}
        {scanBusy ? "Assessing your plant…" : "Assess plant health"}
        {!scanBusy && <ArrowRight size={18} />}
      </button>
      <p className="privacy">
        <ShieldCheck size={14} /> Private history. Photo processed by Google Gemini, directly or via Vercel.
      </p>
    </form>
  );

  const weatherPanel = (
    <section className="panel weather-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">PLAN WITH THE FORECAST</span>
          <h2>Your local weather</h2>
        </div>
        <CloudSun size={25} />
      </div>
      <form className="search-location" onSubmit={searchLocation}>
        <MapPin size={17} />
        <input
          aria-label="Town or city"
          required
          minLength={2}
          maxLength={100}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a town or city"
        />
        <button
          type="submit"
          aria-label="Search location"
          disabled={weatherBusy}
        >
          {weatherBusy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Search size={18} />
          )}
        </button>
      </form>
      {locations.length > 0 && (
        <div className="location-options">
          {locations.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                setLocation(item);
                setLocations([]);
                setQuery("");
                setWeather(null);
              }}
            >
              {item.name}
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      )}
      {weatherError && (
        <p role="alert" className="inline-error">
          {weatherError}
        </p>
      )}
      {weather && location ? (
        <>
          <p className="location-name">
            <MapPin size={14} />
            {location.name}
          </p>
          <div className="temperature">
            <strong>
              {Math.round(weather.temperature)}°<span>C</span>
            </strong>
            <Sun size={58} strokeWidth={1.3} />
          </div>
          <p className="weather-condition">{weatherLabel(weather.code)}</p>
          <div className="weather-stats">
            <span>
              <Droplets size={16} />
              {weather.humidity}% humidity
            </span>
            <span>
              <Wind size={16} />
              {weather.wind} km/h
            </span>
          </div>
          <div className="forecast">
            {weather.daily.map((day) => (
              <div key={day.date}>
                <small>
                  {new Date(day.date + "T12:00:00").toLocaleDateString(
                    undefined,
                    { weekday: "short" },
                  )}
                </small>
                <CloudSun size={20} />
                <strong>{Math.round(day.high)}°</strong>
                <small>{day.rainChance}% rain</small>
              </div>
            ))}
          </div>
          <p className="tiny">
            Forecast time: {weather.time.replace("T", " ")} (local)
          </p>
        </>
      ) : (
        <div className="weather-empty">
          <CloudSun size={58} strokeWidth={1} />
          <h3>A forecast for your field</h3>
          <p>
            Choose a location to see current conditions and the next five days.
          </p>
        </div>
      )}
      <a
        className="attribution"
        href="https://open-meteo.com/"
        target="_blank"
        rel="noreferrer"
      >
        Weather data by Open-Meteo <ArrowUpRight size={12} />
      </a>
    </section>
  );

  const historyPanel = (
    <section className="panel history-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">EVERY PHOTO TELLS A STORY</span>
          <h2>
            {view === "Overview" ? "Recent assessments" : "Your scan history"}
          </h2>
        </div>
        {view === "Overview" && (
          <button
            className="text-button"
            onClick={() => changeView("Scan history")}
          >
            View all <ArrowRight size={15} />
          </button>
        )}
      </div>
      {view === "Scan history" && (
        <label className="record-search">
          <Search size={17} />
          <input
            aria-label="Search assessments"
            placeholder="Search by crop, field, or condition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      )}
      {dataBusy ? (
        <div className="empty">
          <LoaderCircle className="spin" />
          <p>Loading your field records…</p>
        </div>
      ) : recentScans.length ? (
        <div className="scan-list">
          {recentScans.slice(0, view === "Overview" ? 4 : 100).map((scan) => (
            <button
              className="scan-row"
              key={scan.id}
              onClick={() => {
                setSelected(scan);
                setFile(null);
                setView("Plant doctor");
              }}
            >
              {scan.imageUrl ? (
                <img
                  src={scan.imageUrl}
                  alt={`${scan.result.crop} assessment`}
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                />
              ) : (
                <span className="record-icon">
                  <Leaf />
                </span>
              )}
              <span className="scan-info">
                <strong>{scan.result.condition}</strong>
                <small>
                  {scan.result.crop} · {scan.field} · {date(scan.created_at)}
                </small>
              </span>
              <span className={`badge ${scan.result.severity}`}>
                {scan.result.severity}
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon">
            <Leaf size={26} />
          </span>
          <h3>
            {search
              ? "No matching assessments"
              : "Your field story starts here"}
          </h3>
          <p>
            {search
              ? "Try another crop, field, or condition."
              : "Upload your first plant photo. Your assessments will be saved here."}
          </p>
          {!search && (
            <button
              className="text-button"
              onClick={() => {
                changeView("Plant doctor");
                input.current?.focus();
              }}
            >
              Start a plant assessment <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Agriculture Doctor home">
          <span className="brand-mark">
            <Sprout size={27} />
          </span>
          <span>
            Agriculture
            <span className="brand-second">
              Doctor<span className="brand-dot">.</span>
            </span>
          </span>
        </a>
        <p className="nav-caption">YOUR FARM WORKSPACE</p>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.name}
              className={view === item.name ? "nav-item active" : "nav-item"}
              onClick={() => changeView(item.name)}
              aria-current={view === item.name ? "page" : undefined}
            >
              <item.icon size={19} />
              <span>{item.name}</span>
              {view === item.name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-leaf">
            <Leaf size={25} />
          </span>
          <h3>
            Small observations.
            <br />
            Healthier harvests.
          </h3>
          <p>A quick check today can make a difference tomorrow.</p>
          <button onClick={() => changeView("Plant doctor")}>
            Check a plant <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <ShieldCheck size={16} />
          <span>Your records stay private</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <span>{view}</span>
          </div>
          <div className="topbar-actions">
            {session ? (
              <>
                <span className="user-email">{session.user.email}</span>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={async () => {
                    const { error } = await browserSupabase()!.auth.signOut();
                    if (error) setError(error.message);
                    else {
                      setSession(null);
                      setScans([]);
                      setSoil([]);
                      setSelected(null);
                    }
                  }}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                className="signin-button"
                onClick={() => {
                  setAuthMode("signin");
                  setAuthMessage("");
                  setAuthOpen(true);
                }}
              >
                Sign in <ArrowUpRight size={15} />
              </button>
            )}
            <span className="avatar">
              {session?.user.email?.[0]?.toUpperCase() || <Sprout size={19} />}
            </span>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">ROOTED IN BETTER DECISIONS</span>
              <h1>
                {view === "Overview"
                  ? "A little insight. A healthier field."
                  : view}
              </h1>
              <p>
                {view === "Overview"
                  ? "Your plants, soil, and weather. A clearer picture of what needs care."
                  : view === "Plant doctor"
                    ? "Look closer at your crop, one photograph at a time."
                    : view === "Scan history"
                      ? "Revisit your assessments and track what changes in your field."
                      : view === "Soil journal"
                        ? "Keep measured soil readings together, with context from your field."
                        : "Know what the next few days could bring to your field."}
              </p>
            </div>
            {view !== "Plant doctor" && (
              <button
                className="primary compact"
                onClick={() => {
                  changeView("Plant doctor");
                  setSelected(null);
                }}
              >
                <Plus size={17} /> New assessment
              </button>
            )}
          </div>
          {configured === false && (
            <div className="setup-banner">
              <FlaskConical size={19} />
              <span>
                <strong>Workspace setup in progress.</strong> Weather works now.
                Accounts and private records become available when Supabase is
                connected.
              </span>
            </div>
          )}
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={17} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              <Check size={17} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {view === "Overview" && (
            <>
              <section className="welcome-banner">
                <div>
                  <span className="hero-pill">
                    <span /> GROW WITH CONFIDENCE
                  </span>
                  <h2>
                    Good care starts
                    <br />
                    with a closer look.
                  </h2>
                  <p>
                    Spot the signs. Understand your field.
                    <br />
                    Take the next step with confidence.
                  </p>
                  <button onClick={() => changeView("Plant doctor")}>
                    Meet your plant doctor <ArrowRight size={17} />
                  </button>
                </div>
                <div className="plant-art" aria-hidden="true">
                  <div className="art-ring ring-one" />
                  <div className="art-ring ring-two" />
                  <svg viewBox="0 0 370 270">
                    <defs>
                      <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
                        <stop stopColor="#93ba61" />
                        <stop offset="1" stopColor="#365c36" />
                      </linearGradient>
                    </defs>
                    <ellipse
                      cx="183"
                      cy="250"
                      rx="106"
                      ry="11"
                      fill="#0c3029"
                      opacity=".32"
                    />
                    <path
                      d="M185 245 Q175 156 207 58"
                      fill="none"
                      stroke="#c2d49b"
                      strokeWidth="5"
                    />
                    <path
                      d="M188 178 C99 188 96 103 105 82 C174 92 190 120 188 178Z"
                      fill="url(#leaf)"
                    />
                    <path
                      d="M193 149 C268 161 298 100 280 62 C228 70 198 100 193 149Z"
                      fill="url(#leaf)"
                    />
                    <path
                      d="M202 94 C173 70 180 25 212 12 C243 46 225 78 202 94Z"
                      fill="#9cbd76"
                    />
                    <path
                      d="M184 175 L116 96 M195 144 L268 77 M205 88 L212 26"
                      fill="none"
                      stroke="#d1dfb3"
                      strokeWidth="1.5"
                      opacity=".6"
                    />
                    <path d="M156 223 h59 l-10 29 h-39Z" fill="#d1bd98" />
                  </svg>
                  <div className="art-label">
                    <span className="label-icon">
                      <ScanLine size={19} />
                    </span>
                    <span>
                      Every leaf has a story.
                      <small>Let’s understand yours.</small>
                    </span>
                  </div>
                </div>
              </section>
              <section className="metrics">
                <div className="metric">
                  <span className="metric-symbol green">
                    <ScanLine size={21} />
                  </span>
                  <div>
                    <span>Saved assessments</span>
                    <strong>
                      {scans.length}
                      <small>from your latest 100 records</small>
                    </strong>
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-symbol amber">
                    <Leaf size={21} />
                  </span>
                  <div>
                    <span>Worth a closer look</span>
                    <strong>
                      {attention}
                      <small>moderate or high concern</small>
                    </strong>
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-symbol blue">
                    <Droplets size={21} />
                  </span>
                  <div>
                    <span>Latest soil moisture</span>
                    <strong>
                      {latestSoil ? `${latestSoil.moisture}%` : "—"}
                      <small>
                        {latestSoil
                          ? `${latestSoil.field} · ${date(latestSoil.created_at)}`
                          : "Add your first soil reading"}
                      </small>
                    </strong>
                  </div>
                </div>
              </section>
              <div className="main-grid">
                {scanForm}
                {weatherPanel}
              </div>
              <div className="bottom-grid">
                {historyPanel}
                <section className="panel care-panel">
                  <span className="eyebrow">YOUR NEXT GOOD STEP</span>
                  <h2>A moment for your field</h2>
                  <div className="care-item">
                    <span>01</span>
                    <div>
                      <h3>Capture the details</h3>
                      <p>
                        Photograph both sides of a leaf in natural light, with
                        symptoms in focus.
                      </p>
                    </div>
                  </div>
                  <div className="care-item">
                    <span>02</span>
                    <div>
                      <h3>Keep the context</h3>
                      <p>
                        Log soil measurements and field notes to build a useful
                        record.
                      </p>
                    </div>
                  </div>
                  <div className="care-item">
                    <span>03</span>
                    <div>
                      <h3>Check before you act</h3>
                      <p>
                        Photo assessments offer clues. Confirm uncertain
                        findings with a local agronomist.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
          {view === "Plant doctor" && (
            <div className="main-grid plant-grid">
              {scanForm}
              <section className="panel result-panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">A CLOSER LOOK</span>
                    <h2>Plant assessment</h2>
                  </div>
                  <Leaf size={23} />
                </div>
                {selected ? (
                  <>
                    <span className={`badge ${selected.result.severity}`}>
                      {selected.result.severity} concern
                    </span>
                    <h2 className="result-heading">
                      {selected.result.condition}
                    </h2>
                    <p className="muted">
                      {selected.result.crop} · {selected.field} ·{" "}
                      {date(selected.created_at)}
                    </p>
                    <p>{selected.result.summary}</p>
                    <h3>Suggested next steps</h3>
                    <ol className="actions-list">
                      {selected.result.actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ol>
                    <div className="uncertainty">
                      <ShieldCheck size={19} />
                      <p>{selected.result.uncertainty}</p>
                    </div>
                    <p className="tiny">
                      AI image assessment, not a confirmed diagnosis. No
                      measured accuracy or confidence is claimed.
                    </p>
                  </>
                ) : (
                  <div className="empty result-empty">
                    <span className="result-leaf">
                      <Sprout size={56} strokeWidth={1} />
                    </span>
                    <h3>Let’s take a closer look</h3>
                    <p>
                      Upload a clear plant photograph to receive an assessment
                      and practical next steps.
                    </p>
                    <div className="result-check">
                      <Check size={15} /> Image-based observations
                    </div>
                    <div className="result-check">
                      <Check size={15} /> Care suggestions with limitations
                    </div>
                    <div className="result-check">
                      <Check size={15} /> Saved privately to your account
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
          {view === "Scan history" && (
            <>
              {session && (
                <div className="toolbar">
                  <span>Showing your latest {scans.length} assessments</span>
                  <button className="secondary" onClick={exportRecords}>
                    <ArrowDownToLine size={16} /> Export records
                  </button>
                </div>
              )}
              {historyPanel}
            </>
          )}
          {view === "Soil journal" && (
            <div className="main-grid">
              <section className="panel">
                <span className="eyebrow">KNOW YOUR ROOT ZONE</span>
                <h2>Add a soil reading</h2>
                <p className="muted">
                  Enter measurements from your soil sensor or test kit.
                </p>
                <form className="soil-form" onSubmit={saveSoil}>
                  <label>
                    Field name
                    <input
                      name="field"
                      maxLength={80}
                      required
                      placeholder="e.g. North field"
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Moisture (%)
                      <input
                        name="moisture"
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        required
                        placeholder="0–100"
                      />
                    </label>
                    <label>
                      pH
                      <input
                        name="ph"
                        type="number"
                        min={0}
                        max={14}
                        step="0.1"
                        required
                        placeholder="0–14"
                      />
                    </label>
                  </div>
                  <label>
                    Soil temperature (°C)
                    <input
                      name="temperature"
                      type="number"
                      min={-30}
                      max={80}
                      step="0.1"
                      required
                      placeholder="e.g. 24"
                    />
                  </label>
                  <label>
                    Field notes <span className="muted">(optional)</span>
                    <textarea
                      name="notes"
                      maxLength={1000}
                      rows={3}
                      placeholder="Recent irrigation, crop stage, or other observations"
                    />
                  </label>
                  <button className="primary wide" disabled={soilBusy}>
                    {soilBusy ? (
                      <LoaderCircle size={18} className="spin" />
                    ) : (
                      <Plus size={18} />
                    )}{" "}
                    Save reading
                  </button>
                </form>
              </section>
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">MEASURED, NOT ESTIMATED</span>
                    <h2>Soil journal</h2>
                  </div>
                  <Sprout size={23} />
                </div>
                {soil.length ? (
                  <div className="soil-list">
                    {soil.map((reading) => (
                      <article key={reading.id} className="soil-record">
                        <div>
                          <strong>{reading.field}</strong>
                          <small>{date(reading.created_at)}</small>
                        </div>
                        <div className="soil-values">
                          <span>
                            <Droplets size={16} />
                            {reading.moisture}%
                          </span>
                          <span>pH {reading.ph}</span>
                          <span>
                            <Thermometer size={16} />
                            {reading.temperature}°C
                          </span>
                        </div>
                        {reading.notes && <p>{reading.notes}</p>}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty">
                    <Sprout size={40} strokeWidth={1} />
                    <h3>Good soil. Good records.</h3>
                    <p>
                      Your measured readings will appear here. Soil data is
                      never simulated.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
          {view === "Weather" && (
            <div className="main-grid">
              {weatherPanel}
              <section className="panel">
                <span className="eyebrow">WEATHER INTO ACTION</span>
                <h2>Field outlook</h2>
                {weather ? (
                  <>
                    {weatherAdvice(weather).map((tip, i) => (
                      <div className="advice-item" key={i}>
                        <span className="icon-box">
                          <Sprout size={20} />
                        </span>
                        <p>{tip}</p>
                      </div>
                    ))}
                    <p className="tiny">
                      General guidance based on forecast thresholds. Consider
                      your crop, soil, and local conditions.
                    </p>
                  </>
                ) : (
                  <div className="empty">
                    <Wind size={40} strokeWidth={1} />
                    <h3>Make room for the weather</h3>
                    <p>
                      Search for a location to see weather-based field
                      reminders.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
          <footer>
            <span>
              <Sprout size={15} /> Agriculture Doctor
            </span>
            <span>Better observations. Thoughtful care.</span>
          </footer>
        </main>
      </div>
      {authOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !authBusy) setAuthOpen(false);
          }}
        >
          <section
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
          >
            <button
              className="modal-close icon-button"
              aria-label="Close sign in"
              onClick={() => setAuthOpen(false)}
            >
              <X size={20} />
            </button>
            <span className="auth-logo">
              <Sprout size={29} />
            </span>
            <span className="eyebrow">YOUR FIELD, UNDERSTOOD</span>
            <h2 id="auth-title">
              {authMode === "signup"
                ? "Start your field journal"
                : authMode === "reset"
                  ? "Reset your password"
                  : authMode === "update"
                    ? "Choose a new password"
                    : "Welcome back"}
            </h2>
            <p className="muted">
              {authMode === "signin"
                ? "Sign in to your private farming workspace."
                : authMode === "signup"
                  ? "Keep your plant assessments and soil records together."
                  : "Use your email to securely recover your account."}
            </p>
            <form onSubmit={submitAuth}>
              {authMode !== "update" && (
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    autoFocus
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {authMode !== "reset" && (
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    required
                    autoComplete={
                      authMode === "signin"
                        ? "current-password"
                        : "new-password"
                    }
                    placeholder="At least 8 characters"
                  />
                </label>
              )}
              {authMessage && (
                <p className="auth-message" role="status">
                  {authMessage}
                </p>
              )}
              <button
                className="primary wide"
                disabled={authBusy || configured === false}
              >
                {authBusy && <LoaderCircle className="spin" size={17} />}{" "}
                {authMode === "signup"
                  ? "Create account"
                  : authMode === "reset"
                    ? "Send reset link"
                    : authMode === "update"
                      ? "Update password"
                      : "Sign in"}
                <ArrowRight size={17} />
              </button>
            </form>
            {configured === false && (
              <p className="inline-error">
                The workspace is waiting for its Supabase connection.
              </p>
            )}
            {authMode === "signin" && (
              <button
                className="text-button auth-link"
                onClick={() => {
                  setAuthMode("reset");
                  setAuthMessage("");
                }}
              >
                Forgot password?
              </button>
            )}
            {authMode !== "update" && (
              <div className="auth-switch">
                {authMode === "signup"
                  ? "Already have an account?"
                  : "New to Agriculture Doctor?"}
                <button
                  className="text-button"
                  onClick={() => {
                    setAuthMode(authMode === "signup" ? "signin" : "signup");
                    setAuthMessage("");
                  }}
                >
                  {authMode === "signup" ? "Sign in" : "Create an account"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
