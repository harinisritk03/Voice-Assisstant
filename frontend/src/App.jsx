import React, { useState, useEffect, useRef } from "react";
import {
  Mic, Send, ChefHat, ShoppingCart, Apple, Users, LogOut,
  Heart, User, Plus, Square, MessageSquare
} from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost:8000";

const generateUUID = () => {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
};

export default function App() {
  const [user, setUser] = useState(localStorage.getItem("user"));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [view, setView] = useState("social");
  const [recipes, setRecipes] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [isAuthMode, setIsAuthMode] = useState("login");
  const [authData, setAuthData] = useState({ username: "", password: "" });
  const [chatTrigger, setChatTrigger] = useState(null);

  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (token) {
      fetchRecipes();
      fetchProfile();
    }
  }, [token]);

  const fetchRecipes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/recipes`);
      setRecipes(res.data);
    } catch (e) {
      console.error("Fetch Recipes Error", e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/profile`, axiosConfig);
      setProfileData(res.data);
    } catch (e) {
      console.error("Fetch Profile Error", e);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setToken(null);
    window.location.reload();
  };

  const handleAuth = async () => {
    if (!authData.username || !authData.password) {
      alert("Please fill in all fields");
      return;
    }
    try {
      const endpoint = isAuthMode === "login" ? "/login" : "/register";
      const res = await axios.post(`${API_BASE}${endpoint}`, authData);

      if (isAuthMode === "login") {
        setToken(res.data.access_token);
        setUser(authData.username);
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user", authData.username);
      } else {
        alert("Account created! Please log in.");
        setIsAuthMode("login");
        setAuthData({ username: "", password: "" });
      }
    } catch (e) {
      const errorMsg = e.response?.data?.detail || "Authentication failed";
      alert(errorMsg);
      console.error("Auth error:", e);
    }
  };

  const NavBtn = ({ active, onClick, icon: Icon, label }) => (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition",
        active
          ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
          : "text-white/70 hover:text-white hover:bg-white/5",
      ].join(" ")}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 -z-20 h-full w-full object-cover"
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-black/70 to-orange-500/20" />

      {!token ? (
        <div className="min-h-screen w-full flex items-center justify-center p-5">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl p-10 shadow-2xl shadow-black/30 text-center">
            <div className="flex justify-center">
              <ChefHat size={48} className="text-orange-500" />
            </div>
            <h1 className="text-white text-3xl font-bold mt-4">KitchenNova</h1>
            <p className="text-white/70 text-sm mt-2 mb-8">
              Your AI-Powered Kitchen Companion
            </p>

            <input
              className="w-full rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition"
              placeholder="Username"
              value={authData.username}
              onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
            />

            <input
              className="w-full mt-3 rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition"
              type="password"
              placeholder="Password"
              value={authData.password}
              onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />

            <button
              onClick={handleAuth}
              className="w-full mt-6 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 py-3 font-semibold text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition"
            >
              {isAuthMode === "login" ? "Sign In" : "Create Account"}
            </button>

            <button
              onClick={() => {
                setIsAuthMode(isAuthMode === "login" ? "register" : "login");
                setAuthData({ username: "", password: "" });
              }}
              className="mt-5 text-white/80 text-sm hover:text-orange-400 transition"
            >
              {isAuthMode === "login" ? "New here? Register" : "Have an account? Login"}
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="w-[280px] shrink-0 border-r border-white/10 bg-slate-900/90 backdrop-blur-xl flex flex-col py-6 sticky top-0 h-screen">
            <div className="px-6 pb-6 border-b border-white/10 flex items-center gap-3">
              <ChefHat size={28} className="text-orange-500" />
              <span className="text-white text-xl font-bold">KitchenNova</span>
            </div>

            <div className="flex-1 px-4 py-6 space-y-2">
              <NavBtn active={view === "social"} onClick={() => setView("social")} icon={Users} label="Community" />
              <NavBtn active={view === "profile"} onClick={() => setView("profile")} icon={User} label="My Profile" />
              <NavBtn active={view === "chef"} onClick={() => setView("chef")} icon={ChefHat} label="Chef AI" />
              <NavBtn active={view === "grocery"} onClick={() => setView("grocery")} icon={ShoppingCart} label="Grocery AI" />
              <NavBtn active={view === "diet"} onClick={() => setView("diet")} icon={Apple} label="Diet AI" />
            </div>

            <button
              onClick={logout}
              className="mx-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 font-medium flex items-center justify-center gap-2 hover:bg-red-500/20 transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </aside>

          {/* Main content: IMPORTANT – full width, not capped */}
          <main className="flex-1 min-w-0 p-8 overflow-y-auto">
            {/* Full-width container (no 1200px cap). Add max-w-* only if YOU want it. */}
            <div className="w-full">
              {view === "social" && (
                <SocialFeed recipes={recipes} onRefresh={fetchRecipes} token={token} />
              )}

              {view === "profile" && profileData && (
                <ProfileDashboard
                  data={profileData}
                  onCook={(name) => {
                    setChatTrigger(name);
                    setView("chef");
                  }}
                />
              )}

              {["chef", "grocery", "diet"].includes(view) && (
                <AIChat
                  key={view}
                  mode={view}
                  token={token}
                  trigger={chatTrigger}
                  clearTrigger={() => setChatTrigger(null)}
                />
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

/* ----------------------- AI Chat ----------------------- */

const AIChat = ({ mode, token, trigger, clearTrigger }) => {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [sid, setSid] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  const mediaRecorder = useRef(null);
  const historyEndRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => historyEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const loadSessions = () => {
    const storageKey = `sessions_${mode}`;
    const stored = localStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) : [];
    setSessions(parsed);

    if (parsed.length > 0) setSid(parsed[0].id);
    else createNewSession([]);
  };

  const createNewSession = (currentSessions = sessions) => {
    const storageKey = `sessions_${mode}`;
    const newId = generateUUID();
    const newSession = {
      id: newId,
      name: `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}`,
    };
    const updated = [newSession, ...(currentSessions || [])];
    setSessions(updated);
    setSid(newId);
    setMsgs([]);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (!sid || !token) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/ai/history/${mode}/${sid}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setMsgs(res.data || []);
        scrollToBottom();
      })
      .catch((e) => {
        console.error("History load error", e);
        setMsgs([]);
      })
      .finally(() => setLoading(false));
  }, [sid, mode, token]);

  useEffect(() => {
    if (trigger) {
      handleSend(null, `I want to cook ${trigger}. How do I start?`);
      clearTrigger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const handleSend = async (blob = null, overrideText = null) => {
    const text = overrideText || input;
    if (!text && !blob) return;

    setLoading(true);
    const form = new FormData();
    if (blob) form.append("file", blob, "audio.wav");
    else form.append("text", text);
    form.append("mode", mode);
    form.append("session_id", sid);

    try {
      const res = await axios.post(`${API_BASE}/ai/chat`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const historyUpdate = [];
      if (res.data.transcript) historyUpdate.push({ role: "user", text: res.data.transcript });
      else if (!blob) historyUpdate.push({ role: "user", text });

      historyUpdate.push({ role: "bot", text: res.data.response });
      setMsgs((prev) => [...prev, ...historyUpdate]);

      if (res.data.audio) {
        try {
          const audio = new Audio(`data:audio/wav;base64,${res.data.audio}`);
          audio.play().catch(() => {});
        } catch {}
      }

      setInput("");
      scrollToBottom();
    } catch (e) {
      console.error("Chat Error", e);
      alert("Failed to send message. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRecorder.current.stop();
      setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.current = new MediaRecorder(stream);
        const chunks = [];
        mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.current.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/wav" });
          handleSend(blob);
          stream.getTracks().forEach((t) => t.stop());
        };
        mediaRecorder.current.start();
        setRecording(true);
      } catch (e) {
        alert("Microphone access denied");
        console.error("Mic error:", e);
      }
    }
  };

  return (
    // ✅ Full width, full laptop: no max-width caps, min-w-0 fixes flex overflow
    <div className="w-full flex gap-6 h-[80vh] min-w-0">
      {/* Sessions sidebar */}
      <div className="w-[280px] shrink-0 rounded-2xl bg-slate-900/60 backdrop-blur-xl p-5 flex flex-col gap-4 border border-white/10">
        <button
          onClick={() => createNewSession(sessions)}
          className="w-full rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 py-3 text-white font-semibold flex items-center justify-center gap-2 hover:scale-[1.01] transition"
        >
          <Plus size={16} />
          New Chat
        </button>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSid(s.id)}
              className={[
                "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left border transition",
                s.id === sid
                  ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <MessageSquare size={16} />
              <span className="truncate text-sm">{s.name}</span>
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-white/50 text-sm text-center mt-6">No chats yet</p>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 min-w-0 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 overflow-hidden flex flex-col">
        <div className="px-6 py-5 bg-black/30 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-bold tracking-wide">{mode.toUpperCase()} ASSISTANT</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && msgs.length === 0 && <p className="text-white/40 text-center mt-10">Loading...</p>}
          {!loading && msgs.length === 0 && <p className="text-white/40 text-center mt-10">Start a new conversation...</p>}

          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={[
                  "max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-6",
                  m.role === "user"
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-md"
                    : "bg-white/10 text-white rounded-bl-md",
                ].join(" ")}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && msgs.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-white/10 text-white rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                typing...
              </div>
            </div>
          )}

          <div ref={historyEndRef} />
        </div>

        <div className="p-5 bg-black/30 border-t border-white/10 flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or use mic..."
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSend()}
            disabled={loading}
            className="flex-1 min-w-0 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition"
          />

          <button
            onClick={toggleRecord}
            disabled={loading && !recording}
            className={[
              "rounded-xl border px-4 py-3 flex items-center justify-center transition",
              recording
                ? "bg-red-500 border-red-500 text-white"
                : "bg-white/10 border-white/20 text-white hover:bg-white/20",
            ].join(" ")}
            title="Mic"
          >
            {recording ? <Square size={18} className="fill-white" /> : <Mic size={18} />}
          </button>

          <button
            onClick={() => handleSend()}
            disabled={loading || (!input && !recording)}
            className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-white flex items-center justify-center hover:opacity-95 disabled:opacity-50 transition"
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ----------------------- Profile ----------------------- */

const ProfileDashboard = ({ data, onCook }) => (
  <div className="w-full">
    <div className="text-center mb-10">
      <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-orange-500/20 border-4 border-orange-500 flex items-center justify-center">
        <User size={44} className="text-orange-500" />
      </div>
      <h2 className="text-white text-2xl font-bold">{data.username}</h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4">Your Preferences</h3>
        <div className="flex flex-wrap gap-2">
          {data.preferences.map((p) => (
            <span
              key={p}
              className="px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-sm font-medium"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6">
        <h4 className="text-white font-semibold text-lg">Recommended Recipes</h4>
        <p className="text-white/60 text-sm mt-1 mb-4">Click any dish to start cooking with Chef AI</p>

        <div className="space-y-3">
          {data.recommended.map((r) => (
            <button
              key={r.name}
              onClick={() => onCook(r.name)}
              className="w-full rounded-xl bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 p-4 flex items-center justify-between transition"
            >
              <div className="text-left">
                <div className="text-white font-semibold">{r.name}</div>
                <span className="inline-block mt-1 px-3 py-1 rounded-full bg-green-500/10 text-green-300 text-xs border border-green-500/20">
                  {r.type}
                </span>
              </div>
              <ChefHat size={20} className="text-orange-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ----------------------- Social Feed ----------------------- */

const SocialFeed = ({ recipes, onRefresh, token }) => {
  const [showModal, setShowModal] = useState(false);
  const [post, setPost] = useState({ title: "", content: "" });
  const [posting, setPosting] = useState(false);

  const handleLike = async (id) => {
    try {
      await axios.post(
        `${API_BASE}/recipes/like/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onRefresh();
    } catch (e) {
      console.error("Like error:", e);
    }
  };

  const handlePost = async () => {
    if (!post.title || !post.content) {
      alert("Please fill in all fields");
      return;
    }
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("title", post.title);
      formData.append("content", post.content);
      await axios.post(`${API_BASE}/recipes`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowModal(false);
      setPost({ title: "", content: "" });
      onRefresh();
    } catch (e) {
      console.error("Post error:", e);
      alert("Failed to post recipe");
    } finally {
      setPosting(false);
    }
  };

  const me = localStorage.getItem("user");

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-white text-2xl font-bold">Community Recipes</h2>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-5 py-3 text-white font-semibold flex items-center gap-2 hover:scale-[1.01] transition"
        >
          <Plus size={18} />
          Share Recipe
        </button>
      </div>

      {recipes.length === 0 ? (
        <p className="text-white/60 text-center mt-10">No recipes yet. Be the first to share!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recipes.map((r) => {
            const liked = r.liked_by?.includes(me);
            return (
              <div
                key={r._id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 hover:-translate-y-1 transition"
              >
                <div className="text-white/60 text-xs mb-2">@{r.author}</div>
                <h3 className="text-white text-lg font-bold mb-2">{r.title}</h3>
                <p className="text-white/70 leading-6 mb-4">{r.content}</p>

                <button
                  onClick={() => handleLike(r._id)}
                  className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 flex items-center gap-2 text-white transition"
                >
                  <Heart
                    size={18}
                    className={liked ? "text-orange-500 fill-orange-500" : "text-white"}
                  />
                  <span className="text-sm">{r.likes || 0} Likes</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !posting && setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/20 bg-slate-900/95 backdrop-blur-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white text-xl font-bold mb-6">Share Your Recipe</h3>

            <input
              disabled={posting}
              value={post.title}
              onChange={(e) => setPost({ ...post, title: e.target.value })}
              placeholder="Dish Name"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition"
            />

            <textarea
              disabled={posting}
              value={post.content}
              onChange={(e) => setPost({ ...post, content: e.target.value })}
              placeholder="Ingredients and steps..."
              className="w-full mt-3 min-h-[140px] rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition"
            />

            <div className="flex gap-3 mt-6">
              <button
                disabled={posting}
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 py-3 text-white font-semibold hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                disabled={posting}
                onClick={handlePost}
                className="flex-1 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 py-3 text-white font-semibold hover:opacity-95 disabled:opacity-50 transition"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
