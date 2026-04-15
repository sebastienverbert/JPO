/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  CheckCircle2, 
  BarChart3, 
  LogOut,
  LogIn,
  Loader2,
  ExternalLink,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { 
  deleteDoc, 
  doc, 
  writeBatch 
} from 'firebase/firestore';

const SOURCES = [
  // Row 1: Social Networks
  { 
    id: 'Facebook', 
    icon: Facebook, 
    color: 'bg-[#1877F2]',
    label: { fr: 'Facebook', en: 'Facebook', de: 'Facebook' }
  },
  { 
    id: 'Instagram', 
    icon: Instagram, 
    color: 'bg-[#E4405F]',
    label: { fr: 'Instagram', en: 'Instagram', de: 'Instagram' }
  },
  { 
    id: 'LinkedIn', 
    icon: Linkedin, 
    color: 'bg-[#0A66C2]',
    label: { fr: 'LinkedIn', en: 'LinkedIn', de: 'LinkedIn' }
  },
  // Row 2: Media & Signs
  { 
    id: 'Site Internet', 
    icon: Globe, 
    color: 'bg-emerald-600',
    label: { fr: 'Site Internet', en: 'Website', de: 'Website' }
  },
  { 
    id: 'Presse', 
    icon: Newspaper, 
    color: 'bg-slate-700',
    label: { fr: 'Presse', en: 'Press', de: 'Presse' }
  },
  { 
    id: 'Panneaux sur la route', 
    icon: MapPin, 
    color: 'bg-orange-600',
    label: { fr: 'Panneaux sur la route', en: 'Road signs', de: 'Straßenschilder' }
  },
  // Row 3: Personal
  { 
    id: 'Familles, amis, enseignants, Sepas, ...', 
    icon: Users, 
    color: 'bg-purple-600',
    label: { fr: 'Familles, amis, enseignants, Sepas, ...', en: 'Family, friends, teachers, Sepas, ...', de: 'Familie, Freunde, Lehrer, Sepas, ...' }
  },
  // Row 4: Other
  { 
    id: 'Autre', 
    icon: HelpCircle, 
    color: 'bg-gray-500',
    label: { fr: 'Autre', en: 'Other', de: 'Andere' }
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
  },
  de: {
    title: "Wie haben Sie von unserem",
    titleHighlight: "Tag der offenen Tür erfahren?",
    subtitle: "Helfen Sie uns, Sie besser zu bedienen, indem Sie uns mitteilen, wie Sie von dieser Veranstaltung erfahren haben.",
    submit: "Meine Antwort senden",
    thankYou: "Vielen Dank!",
    success: "Ihre Antwort wurde erfolgreich aufgezeichnet.",
    newResponse: "Neue Antwort",
    statsTitle: "Echtzeit-Statistiken",
    backToSurvey: "Zurück zur Umfrage",
    visitWebsite: "Besuchen Sie www.ehtl.lu",
    footer: "Luxemburger Hotel- und Tourismusschule",
    adminLogin: "Admin-Login",
    logout: "Abmelden",
    stats: "Statistiken",
    loading: "Laden...",
    eventLabel: "Tag der offenen Tür"
  }
};

export default function App() {
  const [lang, setLang] = useState<'fr' | 'en' | 'de'>('fr');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [modal, setModal] = useState<{ type: 'confirm' | 'alert', message: string, onConfirm?: () => void } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load logo from localStorage if exists
    const savedLogo = localStorage.getItem('ehtl_logo');
    if (savedLogo) setLogoUrl(savedLogo);

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

  useEffect(() => {
    if (submitted) {
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setSubmitted(false);
            setSelected(null);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [submitted]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'responses'), {
        source: selected,
        timestamp: serverTimestamp(),
      });
      setSubmitted(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1e293b', '#1877F2', '#E4405F', '#0A66C2', '#10b981']
      });
    } catch (error) {
      console.error("Error submitting response:", error);
      setModal({ type: 'alert', message: "Une erreur est survenue lors de l'envoi. Veuillez réessayer." });
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

  const handleLogout = () => {
    signOut(auth);
    setShowStats(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 2MB for localStorage)
      if (file.size > 2 * 1024 * 1024) {
        setModal({ type: 'alert', message: "L'image est trop grande (max 2Mo). Veuillez choisir une image plus légère." });
        return;
      }

      const reader = new FileReader();
      reader.onloadstart = () => setSubmitting(true);
      reader.onloadend = () => {
        const base64String = reader.result as string;
        try {
          setLogoUrl(base64String);
          localStorage.setItem('ehtl_logo', base64String);
          setSubmitting(false);
        } catch (err) {
          console.error("Storage error:", err);
          setModal({ type: 'alert', message: "Erreur lors de la sauvegarde du logo. L'image est peut-être trop lourde." });
          setSubmitting(false);
        }
      };
      reader.onerror = () => {
        setModal({ type: 'alert', message: "Erreur lors de la lecture du fichier." });
        setSubmitting(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const removeLogo = () => {
    setLogoUrl(null);
    localStorage.removeItem('ehtl_logo');
  };

  const exportToCSV = async () => {
    try {
      const q = query(collection(db, 'responses'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          source: d.source,
          date: d.timestamp?.toDate().toLocaleString('fr-FR') || 'N/A'
        };
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + "Source,Date\n"
        + data.map(row => `${row.source},${row.date}`).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ehtl_stats_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export error:", error);
      setModal({ type: 'alert', message: "Erreur lors de l'exportation." });
    }
  };

  const resetData = async () => {
    setModal({
      type: 'confirm',
      message: "ÊTES-VOUS SÛR ? Cette action supprimera TOUTES les réponses enregistrées définitivement.",
      onConfirm: async () => {
        setLoadingStats(true);
        try {
          const q = query(collection(db, 'responses'));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            setModal({ type: 'alert', message: "Aucune donnée à supprimer." });
            setLoadingStats(false);
            return;
          }

          // Firestore batches are limited to 500 operations
          const chunks = [];
          for (let i = 0; i < snapshot.docs.length; i += 500) {
            chunks.push(snapshot.docs.slice(i, i + 500));
          }

          for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
          
          setStats({});
          setModal({ type: 'alert', message: "Toutes les données ont été réinitialisées." });
        } catch (error) {
          console.error("Reset error:", error);
          setModal({ type: 'alert', message: "Erreur lors de la réinitialisation." });
        } finally {
          setLoadingStats(false);
        }
      }
    });
  };

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

          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-3">
            <QRCodeSVG value="https://www.instagram.com/ehtl.lu/" size={120} />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suivez-nous sur Instagram</p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => {
                setSubmitted(false);
                setSelected(null);
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              {t.newResponse}
            </button>
            <p className="text-[10px] text-slate-400 font-medium">
              Retour automatique dans <span className="font-bold text-slate-900">{countdown}s</span>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 p-2 md:p-4 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="EHTL Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Globe className="text-slate-900 w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="font-bold text-[10px] md:text-xs leading-none uppercase tracking-tight max-w-[150px] md:max-w-none">
              École d'Hôtellerie et de Tourisme du Luxembourg
            </h1>
            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">{t.eventLabel}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2 mr-2">
              <button 
                onClick={triggerUpload}
                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-blue-100 flex items-center gap-1" 
                title="Changer le logo"
              >
                <Upload className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase hidden md:inline">Logo</span>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                />
              </button>
              {logoUrl && (
                <button onClick={removeLogo} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors border border-red-100" title="Supprimer le logo">
                  <span className="text-[10px] font-bold uppercase">X</span>
                </button>
              )}
            </div>
          )}

          <div className="flex bg-slate-200 p-0.5 rounded-lg">
            <button 
              onClick={() => setLang('fr')}
              className={`w-8 h-8 flex items-center justify-center text-lg rounded-md transition-all ${lang === 'fr' ? 'bg-white shadow-sm scale-110' : 'opacity-50 hover:opacity-100'}`}
              title="Français"
            >
              🇫🇷
            </button>
            <button 
              onClick={() => setLang('en')}
              className={`w-8 h-8 flex items-center justify-center text-lg rounded-md transition-all ${lang === 'en' ? 'bg-white shadow-sm scale-110' : 'opacity-50 hover:opacity-100'}`}
              title="English"
            >
              🇬🇧
            </button>
            <button 
              onClick={() => setLang('de')}
              className={`w-8 h-8 flex items-center justify-center text-lg rounded-md transition-all ${lang === 'de' ? 'bg-white shadow-sm scale-110' : 'opacity-50 hover:opacity-100'}`}
              title="Deutsch"
            >
              🇩🇪
            </button>
          </div>

          <div className="flex items-center gap-1">
            {isAdmin && (
              <button 
                onClick={() => setShowStats(!showStats)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                title={TRANSLATIONS.fr.stats}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
            {user ? (
              <button 
                onClick={handleLogout}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                title={t.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleLogin}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                title={t.adminLogin}
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center min-h-0">
        <AnimatePresence mode="wait">
          {showStats && isAdmin ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass rounded-2xl p-4 md:p-6 space-y-4 overflow-y-auto max-h-full"
            >
              <div className="flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10">
                <h2 className="text-xl font-bold">{TRANSLATIONS.fr.statsTitle}</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={exportToCSV}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md uppercase"
                  >
                    Exporter CSV
                  </button>
                  <button 
                    onClick={resetData}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded-md uppercase"
                  >
                    Réinitialiser
                  </button>
                  <button 
                    onClick={() => setShowStats(false)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 ml-2"
                  >
                    {TRANSLATIONS.fr.backToSurvey}
                  </button>
                </div>
              </div>

              {loadingStats ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="grid gap-3">
                  {SOURCES.map(source => {
                    const count = stats[source.id] || 0;
                    const total = (Object.values(stats) as number[]).reduce((a: number, b: number) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    
                    return (
                      <div key={source.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="flex items-center gap-1.5">
                            <source.icon className="w-3.5 h-3.5 text-slate-500" />
                            {source.label.fr}
                          </span>
                          <span>{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col h-full"
            >
              <div className="text-center space-y-1 mb-4 shrink-0">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  {t.title} <span className="text-slate-400">{t.titleHighlight}</span>
                </h2>
                <p className="text-slate-500 text-sm max-w-lg mx-auto">
                  {t.subtitle}
                </p>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-1">
                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                  {/* Row 1: Social Networks */}
                  {SOURCES.slice(0, 3).map((source) => (
                    <SurveyButton key={source.id} source={source} selected={selected} onSelect={setSelected} lang={lang} />
                  ))}
                  
                  {/* Row 2: Media & Signs */}
                  {SOURCES.slice(3, 6).map((source) => (
                    <SurveyButton key={source.id} source={source} selected={selected} onSelect={setSelected} lang={lang} />
                  ))}

                  {/* Row 3: Personal (Full width or centered) */}
                  <div className="col-span-3">
                    <SurveyButton source={SOURCES[6]} selected={selected} onSelect={setSelected} lang={lang} isWide />
                  </div>

                  {/* Row 4: Other */}
                  <div className="col-span-3">
                    <SurveyButton source={SOURCES[7]} selected={selected} onSelect={setSelected} lang={lang} isWide />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col items-center gap-3 shrink-0">
                <button
                  disabled={!selected || submitting}
                  onClick={handleSubmit}
                  className={`w-full max-w-md py-3 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                    !selected 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg active:scale-[0.98]'
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>{t.submit}</>
                  )}
                </button>
                
                <a 
                  href="https://www.ehtl.lu" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-[10px] font-bold uppercase tracking-wider"
                >
                  {t.visitWebsite} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-4xl mx-auto mt-4 pt-2 border-t border-slate-200 text-center text-slate-400 text-[9px] uppercase tracking-widest font-bold shrink-0">
        &copy; {new Date().getFullYear()} {t.footer}
      </footer>

      {/* Custom Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <p className="text-slate-700 font-medium text-center">{modal.message}</p>
              <div className="flex gap-3">
                {modal.type === 'confirm' ? (
                  <>
                    <button 
                      onClick={() => setModal(null)}
                      className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={() => {
                        modal.onConfirm?.();
                        setModal(null);
                      }}
                      className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                      Confirmer
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setModal(null)}
                    className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                  >
                    OK
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SurveyButtonProps {
  key?: string | number;
  source: typeof SOURCES[0];
  selected: string | null;
  onSelect: (id: string) => void;
  lang: 'fr' | 'en' | 'de';
  isWide?: boolean;
}

function SurveyButton({ source, selected, onSelect, lang, isWide = false }: SurveyButtonProps) {
  const isSelected = selected === source.id;
  
  return (
    <button
      onClick={() => onSelect(source.id)}
      className={`relative p-3 md:p-4 rounded-2xl text-left transition-all duration-200 group flex items-center gap-3 ${
        isSelected 
          ? 'bg-slate-900 text-white shadow-lg scale-[1.02] z-10' 
          : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
      } ${isWide ? 'w-full' : ''}`}
    >
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
        isSelected ? 'bg-white/20' : `${source.color} text-white shadow-sm group-hover:scale-110`
      }`}>
        <source.icon className="w-5 h-5" />
      </div>
      <span className={`font-bold text-xs md:text-sm leading-tight block ${isSelected ? 'text-white' : 'text-slate-700'}`}>
        {source.label[lang]}
      </span>
      {isSelected && (
        <motion.div 
          layoutId="check"
          className="ml-auto"
        >
          <CheckCircle2 className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </button>
  );
}
