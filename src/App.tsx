/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  query, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  Facebook, 
  Instagram, 
  Globe, 
  Linkedin, 
  Newspaper, 
  MapPin, 
  Users,
  CheckCircle2, 
  BarChart3, 
  LogOut,
  LogIn,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SOURCES = [
  { 
    id: 'Facebook', 
    icon: Facebook, 
    color: 'bg-blue-600',
    label: { fr: 'Facebook', en: 'Facebook' }
  },
  { 
    id: 'Instagram', 
    icon: Instagram, 
    color: 'bg-pink-600',
    label: { fr: 'Instagram', en: 'Instagram' }
  },
  { 
    id: 'Site Internet', 
    icon: Globe, 
    color: 'bg-emerald-600',
    label: { fr: 'Site Internet', en: 'Website' }
  },
  { 
    id: 'LinkedIn', 
    icon: Linkedin, 
    color: 'bg-blue-700',
    label: { fr: 'LinkedIn', en: 'LinkedIn' }
  },
  { 
    id: 'Presse', 
    icon: Newspaper, 
    color: 'bg-slate-700',
    label: { fr: 'Presse', en: 'Press' }
  },
  { 
    id: 'Panneaux sur la route', 
    icon: MapPin, 
    color: 'bg-orange-600',
    label: { fr: 'Panneaux sur la route', en: 'Road signs' }
  },
  { 
    id: 'Familles, amis, enseignants, Sepass, ...', 
    icon: Users, 
    color: 'bg-purple-600',
    label: { fr: 'Familles, amis, enseignants, Sepass, ...', en: 'Family, friends, teachers, Sepass, ...' }
  },
];

const ADMIN_EMAIL = "sebastien.verbert@ebac.lu";

const TRANSLATIONS = {
  fr: {
    title: "Comment avez-vous connu nos",
    titleHighlight: "portes ouvertes ?",
    subtitle: "Aidez-nous à mieux vous servir en nous indiquant comment vous avez entendu parler de cet événement.",
    submit: "Envoyer ma réponse",
    thankYou: "Merci beaucoup !",
    success: "Votre réponse a été enregistrée avec succès.",
    newResponse: "Nouvelle réponse",
    statsTitle: "Statistiques en temps réel",
    backToSurvey: "Retour au sondage",
    visitWebsite: "Visiter www.ehtl.lu",
    footer: "École d'Hôtellerie et de Tourisme du Luxembourg",
    adminLogin: "Connexion Admin",
    logout: "Déconnexion",
    stats: "Statistiques",
    loading: "Chargement...",
    eventLabel: "Portes Ouvertes"
  },
  en: {
    title: "How did you hear about our",
    titleHighlight: "open days?",
    subtitle: "Help us serve you better by telling us how you heard about this event.",
    submit: "Submit my response",
    thankYou: "Thank you very much!",
    success: "Your response has been successfully recorded.",
    newResponse: "New response",
    statsTitle: "Real-time statistics",
    backToSurvey: "Back to survey",
    visitWebsite: "Visit www.ehtl.lu",
    footer: "Luxembourg Hotel and Tourism School",
    adminLogin: "Admin Login",
    logout: "Logout",
    stats: "Statistics",
    loading: "Loading...",
    eventLabel: "Open Days"
  }
};

export default function App() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (showStats && user?.email === ADMIN_EMAIL) {
      setLoadingStats(true);
      const q = query(collection(db, 'responses'), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newStats: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
          const source = doc.data().source;
          newStats[source] = (newStats[source] || 0) + 1;
        });
        setStats(newStats);
        setLoadingStats(false);
      }, (error) => {
        console.error("Error fetching stats:", error);
        setLoadingStats(false);
      });
      return () => unsubscribe();
    }
  }, [showStats, user]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'responses'), {
        source: selected,
        timestamp: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("Une erreur est survenue lors de l'envoi. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const t = TRANSLATIONS[lang];

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full glass rounded-3xl p-8 text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">{t.thankYou}</h1>
            <p className="text-slate-600">{t.success}</p>
          </div>
          <button 
            onClick={() => {
              setSubmitted(false);
              setSelected(null);
            }}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-colors"
          >
            {t.newResponse}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <Globe className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">EHTL</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t.eventLabel}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button 
              onClick={() => setLang('fr')}
              className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${lang === 'fr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              FR
            </button>
            <button 
              onClick={() => setLang('en')}
              className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              EN
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => setShowStats(!showStats)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                title={t.stats}
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            )}
            {user ? (
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                title={t.logout}
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={handleLogin}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                title={t.adminLogin}
              >
                <LogIn className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {showStats && isAdmin ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-3xl p-8 space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t.statsTitle}</h2>
                <button 
                  onClick={() => setShowStats(false)}
                  className="text-sm font-medium text-slate-500 hover:text-slate-900"
                >
                  {t.backToSurvey}
                </button>
              </div>

              {loadingStats ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="grid gap-6">
                  {SOURCES.map(source => {
                    const count = stats[source.id] || 0;
                    const total = (Object.values(stats) as number[]).reduce((a: number, b: number) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    
                    return (
                      <div key={source.id} className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="flex items-center gap-2">
                            <source.icon className="w-4 h-4 text-slate-500" />
                            {source.label[lang]}
                          </span>
                          <span>{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={`h-full ${source.color}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="survey"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
                  {t.title} <span className="text-slate-400">{t.titleHighlight}</span>
                </h2>
                <p className="text-slate-500 text-lg max-w-xl mx-auto">
                  {t.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {SOURCES.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSelected(source.id)}
                    className={`relative p-6 rounded-3xl text-left transition-all duration-300 group ${
                      selected === source.id 
                        ? 'bg-slate-900 text-white shadow-2xl scale-[1.02]' 
                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-colors ${
                      selected === source.id ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'
                    }`}>
                      <source.icon className={`w-6 h-6 ${selected === source.id ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                    <span className="font-bold text-lg leading-tight block">{source.label[lang]}</span>
                    {selected === source.id && (
                      <motion.div 
                        layoutId="check"
                        className="absolute top-4 right-4"
                      >
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-col items-center gap-6">
                <button
                  disabled={!selected || submitting}
                  onClick={handleSubmit}
                  className={`w-full max-w-md py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 ${
                    !selected 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl hover:shadow-2xl active:scale-[0.98]'
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>{t.submit}</>
                  )}
                </button>
                
                <a 
                  href="https://www.ehtl.lu" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium"
                >
                  {t.visitWebsite} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-4xl mx-auto mt-20 pt-8 border-t border-slate-200 text-center text-slate-400 text-xs uppercase tracking-widest font-bold">
        &copy; {new Date().getFullYear()} {t.footer}
      </footer>
    </div>
  );
}
