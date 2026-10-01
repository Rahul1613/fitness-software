import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import {
  Dumbbell,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle,
  Users,
  Award,
  ArrowRight,
  Flame,
  Activity,
  Send,
  ExternalLink,
  Play,
  Instagram,
  Sparkles,
  ChevronRight,
  X,
  IdCard,
  Download,
  Search,
  AlertCircle,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { getGymSettings, getAllPlans, getAllMembers } from '@/db/repository';
import { formatCurrency, formatDate } from '@/lib/dateUtils';
import { buildWhatsAppUrl, cleanIndianPhone } from '@/lib/messageTemplates';
import { generateQrToken } from '@/lib/qrToken';
import type { Gym, Plan, Member } from '@/types';

export const PublicWebsite: React.FC = () => {
  const navigate = useNavigate();
  const [gym, setGym] = useState<Gym | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Membership enquiry form
  const [trialName, setTrialName] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialGoal, setTrialGoal] = useState('Weight Training & Muscle');
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Video modal state
  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null);

  // Gallery filter state
  const [galleryCategory, setGalleryCategory] = useState<'all' | 'strength' | 'cardio' | 'training'>('all');

  // ID Card Download Modal State
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [idQuery, setIdQuery] = useState('');
  const [searchedMember, setSearchedMember] = useState<Member | null>(null);
  const [idQrDataUrl, setIdQrDataUrl] = useState<string>('');
  const [idLookupError, setIdLookupError] = useState('');
  const [isSearchingId, setIsSearchingId] = useState(false);

  useEffect(() => {
    async function load() {
      const [g, p] = await Promise.all([getGymSettings(), getAllPlans()]);
      setGym(g || null);
      setPlans(p.filter((plan) => plan.is_active));
    }
    load();
  }, []);

  const handleTrialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialName.trim() || !trialPhone.trim()) return;

    const message = `Hi AIM Fitness! I would like to enquire about membership and training in Ratnagiri.\nName: ${trialName}\nPhone: ${trialPhone}\nGoal: ${trialGoal}`;
    const gymPhone = gym?.whatsapp_number && !gym.whatsapp_number.includes('TODO')
      ? gym.whatsapp_number
      : '9822123456';

    const url = buildWhatsAppUrl(gymPhone, message);
    window.open(url, '_blank');
    setFormSubmitted(true);
  };

  const handleLookupMember = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idQuery.trim()) return;

    setIsSearchingId(true);
    setIdLookupError('');
    setSearchedMember(null);
    setIdQrDataUrl('');

    try {
      const all = await getAllMembers();
      const q = idQuery.trim().toLowerCase();
      const cleanPhone = cleanIndianPhone(idQuery.trim());

      const found = all.find(
        (m) =>
          m.member_code.toLowerCase() === q ||
          m.phone === cleanPhone ||
          m.phone.includes(q) ||
          m.full_name.toLowerCase() === q
      );

      if (!found) {
        setIdLookupError(
          'No member found with this ID or phone number. Please check and try again, or visit reception.'
        );
        return;
      }

      setSearchedMember(found);

      // Generate QR Code token for member
      if (gym) {
        const token = await generateQrToken(gym.id, found.id, gym.qr_secret);
        const qrUrl = await QRCode.toDataURL(token, {
          width: 320,
          margin: 1,
          color: { dark: '#0f1117', light: '#ffffff' },
        });
        setIdQrDataUrl(qrUrl);
      }
    } catch {
      setIdLookupError('An error occurred while generating ID card. Please try again.');
    } finally {
      setIsSearchingId(false);
    }
  };

  const handleDownloadIdCardPdf = () => {
    if (!searchedMember || !gym) return;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54],
    });

    // Dark background #0f1117
    pdf.setFillColor(15, 17, 23);
    pdf.rect(0, 0, 85.6, 54, 'F');

    // Brand header banner #e11d48 (Rose)
    pdf.setFillColor(225, 29, 72);
    pdf.rect(0, 0, 85.6, 11, 'F');

    // Header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('AIM FITNESS', 4, 7);

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text('RATNAGIRI • OFFICIAL MEMBER CARD', 81, 7, { align: 'right' });

    // Member Name & Code
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.text(searchedMember.full_name.substring(0, 24), 4, 18);

    pdf.setTextColor(244, 63, 94);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(searchedMember.member_code, 4, 23);

    // Member details
    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text(`Phone: +91 ${searchedMember.phone}`, 4, 29);
    pdf.text(`Joined: ${formatDate(searchedMember.join_date)}`, 4, 33);
    pdf.text(`Valid Till: ${formatDate(searchedMember.current_due_date)}`, 4, 37);

    // Gym Slogan & Contact
    pdf.setTextColor(203, 213, 225);
    pdf.setFontSize(5.5);
    pdf.text('Gymming Beyond Tradition', 4, 45);
    pdf.text(`Gym Contact: ${gym.phone || '+91 9822123456'}`, 4, 49);

    // QR Code on right side
    if (idQrDataUrl) {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(54, 14, 28, 28, 2, 2, 'F');
      pdf.addImage(idQrDataUrl, 'PNG', 55, 15, 26, 26);

      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(5);
      pdf.text('SCAN FOR ATTENDANCE', 68, 45, { align: 'center' });
    }

    pdf.save(`AIM_Fitness_ID_Card_${searchedMember.member_code}.pdf`);
  };

  // High quality gym photography
  const galleryItems = [
    {
      id: 1,
      title: 'Heavy Strength & Free Weights Zone',
      category: 'strength',
      caption: 'Olympic barbells, dumbbells from 2.5kg to 45kg, and heavy lifting platforms.',
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 2,
      title: 'Precision Biomechanical Racks & Machines',
      category: 'strength',
      caption: 'Pin-loaded and plate-loaded machines for isolated muscle hypertrophy.',
      image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 3,
      title: 'Endurance & Cardio Deck',
      category: 'cardio',
      caption: 'Commercial treadmills, cross trainers, and spin bikes with heart rate tracking.',
      image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 4,
      title: '1-on-1 Personal Coaching on Floor',
      category: 'training',
      caption: 'Certified fitness coaches ensuring form safety and progressive overload.',
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 5,
      title: 'Squat Racks & Deadlift Stations',
      category: 'strength',
      caption: 'Dedicated power racks for squats, bench presses, and compound lifts.',
      image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 6,
      title: 'High-Energy HIIT & Conditioning Area',
      category: 'cardio',
      caption: 'Kettlebells, battle ropes, and functional conditioning tools for fat burn.',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200&auto=format&fit=crop',
    },
  ];

  const filteredGallery = galleryCategory === 'all'
    ? galleryItems
    : galleryItems.filter((item) => item.category === galleryCategory);

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 selection:bg-rose-500 selection:text-white">
      {/* ========================================================= */}
      {/* 1. PUBLIC NAVBAR                                          */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-dark-950/95 backdrop-blur-md border-b border-dark-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo with clean white backing */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="h-11 px-2 py-1 bg-white rounded-xl shadow-md flex items-center justify-center shrink-0 border border-slate-200">
              <img src="/logo.png" alt="AIM Fitness" className="h-full w-auto object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-base tracking-wider text-white">AIM FITNESS</span>
                <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Ratnagiri
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Gymming Beyond Tradition</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a href="#about" className="hover:text-rose-400 transition-colors">About</a>
            <a href="#gallery" className="hover:text-rose-400 transition-colors">Facility Photos</a>
            <a href="#video-tour" className="hover:text-rose-400 transition-colors">Video Tour</a>
            <a href="#services" className="hover:text-rose-400 transition-colors">Programs</a>
            <a href="#plans" className="hover:text-rose-400 transition-colors">Membership</a>
            <a href="#social" className="hover:text-rose-400 transition-colors">Instagram</a>
            <a href="#timings" className="hover:text-rose-400 transition-colors">Timings & Location</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <a
              href="https://www.instagram.com/aimfitness_ratnagiri/"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-dark-850 hover:bg-dark-800 text-rose-400 border border-dark-750 transition-colors"
              title="Follow on Instagram @aimfitness_ratnagiri"
            >
              <Instagram className="w-4 h-4" />
            </a>

            <button
              onClick={() => setIsIdModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <IdCard className="w-3.5 h-3.5 text-rose-400" />
              <span>Download My ID Card</span>
            </button>

            <button
              onClick={() => navigate('/portal')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-750 transition-colors hidden md:block"
            >
              Member Portal
            </button>

            <a
              href="#plans"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all hidden sm:inline-flex items-center gap-1.5"
            >
              <span>View Plans</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION WITH PROMINENT LOGO & SLOGAN              */}
      {/* ========================================================= */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden bg-gradient-to-b from-dark-950 via-dark-900 to-dark-900 border-b border-dark-800">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center space-y-7 relative z-10">
          {/* Logo Showcase Banner */}
          <div className="inline-block p-3 bg-white rounded-3xl shadow-2xl shadow-rose-950/40 border border-slate-200 animate-in zoom-in-95 duration-300">
            <img
              src="/logo.png"
              alt="AIM Fitness - Gymming Beyond Tradition"
              className="h-28 sm:h-36 mx-auto object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ratnagiri&apos;s Premier Strength & Conditioning Club</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight">
            GYMMING BEYOND <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-red-500 to-orange-500">
              TRADITION.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
            Welcome to <strong className="text-white">AIM Fitness, Ratnagiri</strong>. State-of-the-art resistance machinery, Olympic free weights, personalized training, and an unbeatable workout atmosphere.
          </p>

          {/* Social Proof & Metrics */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 pt-1">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-750">
              <Award className="w-4 h-4 text-rose-400" />
              <span>Certified Coaches</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-750">
              <Dumbbell className="w-4 h-4 text-rose-400" />
              <span>Imported Resistance Gear</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-750">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>Prime Ratnagiri Location</span>
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={() => setIsIdModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-xl shadow-rose-600/35 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
              <IdCard className="w-4 h-4" />
              <span>Download My ID Card</span>
            </button>

            <a
              href="#plans"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm font-bold bg-dark-850 hover:bg-dark-800 text-slate-100 border border-dark-700 flex items-center justify-center gap-2 transition-all"
            >
              <span>Membership Plans</span>
              <ArrowRight className="w-4 h-4 text-rose-400" />
            </a>

            <a
              href="#video-tour"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-bold bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-700 flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 text-rose-400" />
              <span>Facility Tour</span>
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. FACILITY PHOTO GALLERY                                 */}
      {/* ========================================================= */}
      <section id="gallery" className="py-20 px-4 max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Floor Showcase</span>
            <h2 className="text-3xl font-black text-white mt-1">Inside AIM Fitness Ratnagiri</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Explore our modern workout zones equipped for serious muscle building, metabolic conditioning, and powerlifting.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-dark-850 p-1.5 rounded-2xl border border-dark-750 self-start md:self-auto overflow-x-auto">
            {(['all', 'strength', 'cardio', 'training'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setGalleryCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  galleryCategory === cat
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All Zones' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGallery.map((item) => (
            <div
              key={item.id}
              className="group relative bg-dark-850 border border-dark-750 rounded-3xl overflow-hidden shadow-lg transition-all hover:border-rose-500/50"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-dark-950 relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
              </div>

              <div className="p-5 space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {item.category}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">AIM Ratnagiri</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. VIDEO TOUR & WORKOUT REELS SECTION                     */}
      {/* ========================================================= */}
      <section id="video-tour" className="py-20 px-4 bg-dark-950 border-y border-dark-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Video Experience</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Experience The Energy</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Get an immersive look inside AIM Fitness floor sessions, high-intensity workouts, and member transformations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Featured Tour Video */}
            <div className="lg:col-span-2 relative rounded-3xl overflow-hidden bg-dark-900 border border-dark-750 shadow-2xl group aspect-video">
              <img
                src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1200&auto=format&fit=crop"
                alt="AIM Fitness Video Tour"
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex flex-col justify-between p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg">
                    Official Facility Tour
                  </span>
                  <span className="text-xs text-white/80 font-mono">AIM Fitness 2026</span>
                </div>

                <div className="text-center space-y-3">
                  <button
                    onClick={() => setActiveVideoModal('main-tour')}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-2xl shadow-rose-600/50 flex items-center justify-center mx-auto transition-transform hover:scale-110 active:scale-95 group"
                  >
                    <Play className="w-8 h-8 ml-1" />
                  </button>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Walkthrough: Gym Floor, Equipment & Coaches
                  </h3>
                </div>

                <div className="text-xs text-slate-300 flex items-center justify-between">
                  <span>Ratnagiri, Maharashtra</span>
                  <span>Tap to Play</span>
                </div>
              </div>
            </div>

            {/* Video Reels & Highlights Column */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* Highlight Clip 1 */}
              <div
                onClick={() => setActiveVideoModal('strength-reel')}
                className="cursor-pointer p-4 rounded-2xl bg-dark-900 border border-dark-800 hover:border-rose-500/40 flex items-center gap-4 transition-all group"
              >
                <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-dark-950 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=400&auto=format&fit=crop"
                    alt="Strength Training"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Reel Highlight</span>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition-colors">
                    Heavy Barbell Squats & Deadlifts
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Technique & powerlifting coaching</p>
                </div>
              </div>

              {/* Highlight Clip 2 */}
              <div
                onClick={() => setActiveVideoModal('cardio-reel')}
                className="cursor-pointer p-4 rounded-2xl bg-dark-900 border border-dark-800 hover:border-rose-500/40 flex items-center gap-4 transition-all group"
              >
                <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-dark-950 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=400&auto=format&fit=crop"
                    alt="Cardio Conditioning"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Reel Highlight</span>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition-colors">
                    Metabolic HIIT Conditioning
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Fat loss and endurance sessions</p>
                </div>
              </div>

              {/* Instagram link box */}
              <a
                href="https://www.instagram.com/aimfitness_ratnagiri/"
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-dark-850 to-dark-850 border border-rose-500/30 flex items-center justify-between hover:border-rose-500/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">More Workout Reels on Instagram</h5>
                    <p className="text-[11px] text-slate-400">@aimfitness_ratnagiri</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-rose-400" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. ABOUT & WHY CHOOSE AIM FITNESS                         */}
      {/* ========================================================= */}
      <section id="about" className="py-20 px-4 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Why AIM Fitness</span>
          <h2 className="text-3xl font-black text-white">Built For Real Physical Transformation</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-dark-850 border border-dark-750 space-y-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 w-fit">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Heavy Iron & Machine Variety</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Equipped with calibrated weight plates, heavy dumbells, and specialized benches to target muscle groups from multiple angles.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-dark-850 border border-dark-750 space-y-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 w-fit">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Digital Member Check-In & Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every member gets a digital QR card for instant check-in, tracking attendance history and dues on their phone.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-dark-850 border border-dark-750 space-y-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Certified Personal Training</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Experienced trainers available on the gym floor for technique correction, customized progression plans, and diet counsel.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. TRAINING DISCIPLINES                                    */}
      {/* ========================================================= */}
      <section id="services" className="py-20 px-4 bg-dark-950 border-y border-dark-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Training Programs</span>
            <h2 className="text-3xl font-black text-white">Our Workout Disciplines</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Weight Training',
                desc: 'Hypertrophy and strength programs designed for progressive overload.',
                icon: Dumbbell,
              },
              {
                title: 'Weight Loss & HIIT',
                desc: 'High-intensity interval training designed for metabolic conditioning.',
                icon: Flame,
              },
              {
                title: 'Personal Coaching',
                desc: '1-on-1 coaching for accelerated goals, safety, and accountability.',
                icon: Users,
              },
              {
                title: 'Diet & Nutrition',
                desc: 'Structured macro and diet guidance to fuel muscle recovery.',
                icon: Activity,
              },
            ].map((srv, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-dark-900 border border-dark-800 space-y-3">
                <srv.icon className="w-6 h-6 text-rose-500" />
                <h3 className="text-sm font-bold text-white">{srv.title}</h3>
                <p className="text-xs text-slate-400">{srv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. MEMBERSHIP PLANS (Dynamically synced from IndexedDB)   */}
      {/* ========================================================= */}
      <section id="plans" className="py-20 px-4 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Transparent Rates</span>
          <h2 className="text-3xl font-black text-white">Membership Plans</h2>
          <p className="text-xs text-slate-400">
            No hidden admission fees. All plans include full gym floor access in Ratnagiri.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p, idx) => (
            <div
              key={p.id}
              className={`p-6 rounded-3xl border flex flex-col justify-between transition-all ${
                idx === 1
                  ? 'bg-dark-850 border-rose-500 ring-1 ring-rose-500 shadow-xl shadow-rose-500/10'
                  : 'bg-dark-850 border-dark-750'
              }`}
            >
              <div>
                {idx === 1 && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white mb-2 inline-block">
                    Most Popular
                  </span>
                )}
                <h3 className="text-base font-bold text-white">{p.name}</h3>
                <div className="mt-3 mb-4">
                  <span className="text-3xl font-black text-rose-400">{formatCurrency(p.price)}</span>
                  <span className="text-xs text-slate-400 ml-1">/ {p.duration_months} {p.duration_months === 1 ? 'Month' : 'Months'}</span>
                </div>

                <ul className="text-xs text-slate-300 space-y-2 border-t border-dark-800 pt-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Full access to gym floor & weights</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Locker & changing room amenities</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Digital QR Member Pass</span>
                  </li>
                </ul>
              </div>

              <a
                href="#enquiry"
                className="mt-6 w-full py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white text-center shadow-md shadow-rose-600/20 transition-all block"
              >
                Enroll / Enquire Now
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. MEMBER DIGITAL ID CARD DOWNLOAD SECTION                */}
      {/* ========================================================= */}
      <section id="id-card" className="py-16 px-4 bg-gradient-to-b from-dark-900 to-dark-950 border-t border-dark-800">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-rose-950/40 via-dark-850 to-dark-900 border-2 border-rose-500/30 p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase tracking-wider">
            <IdCard className="w-4 h-4 text-rose-400" />
            <span>Official Digital Member Pass</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Download Your AIM Fitness ID Card
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
              Already registered at AIM Fitness Ratnagiri? Enter your Member ID (e.g. AIM-0001) or registered phone number to download your official membership card with scannable QR attendance code.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookupMember();
              setIsIdModalOpen(true);
            }}
            className="max-w-md mx-auto flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              placeholder="Enter Member ID (AIM-0001) or Phone..."
              value={idQuery}
              onChange={(e) => setIdQuery(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl bg-dark-950 border border-dark-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 shrink-0 transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Get My Card</span>
            </button>
          </form>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. SOCIAL PLATFORMS & COMMUNITY HUB                      */}
      {/* ========================================================= */}
      <section id="social" className="py-20 px-4 bg-dark-950 border-t border-dark-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Connect With Us</span>
            <h2 className="text-3xl font-black text-white">Join The AIM Community</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Follow our daily workout reels, PR celebrations, transformation stories, and member updates on social platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Instagram Card */}
            <div className="p-6 rounded-3xl bg-dark-900 border border-dark-800 hover:border-rose-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white">
                  <Instagram className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400">
                  Daily Stories
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instagram</h3>
                <p className="text-xs text-rose-400 font-mono mt-0.5">@aimfitness_ratnagiri</p>
                <p className="text-xs text-slate-400 mt-2">
                  Daily workout footage, trainer tips, nutrition advice, and gym announcements.
                </p>
              </div>
              <a
                href="https://www.instagram.com/aimfitness_ratnagiri/"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all block text-center"
              >
                <span>Follow on Instagram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* WhatsApp Card */}
            <div className="p-6 rounded-3xl bg-dark-900 border border-dark-800 hover:border-emerald-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  Direct Desk
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">WhatsApp Front Desk</h3>
                <p className="text-xs text-emerald-400 font-mono mt-0.5">Chat Directly</p>
                <p className="text-xs text-slate-400 mt-2">
                  Ask questions about fees, personal training, schedule, or trial workouts anytime.
                </p>
              </div>
              <a
                href={buildWhatsAppUrl(
                  gym?.phone || '9822123456',
                  'Hi AIM Fitness! I would like to enquire about gym memberships in Ratnagiri.'
                )}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all block text-center"
              >
                <span>Chat on WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Google Maps / Location Card */}
            <div className="p-6 rounded-3xl bg-dark-900 border border-dark-800 hover:border-sky-500/40 transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400">
                  Ratnagiri
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Google Maps Location</h3>
                <p className="text-xs text-sky-400 font-mono mt-0.5">Ratnagiri, Maharashtra</p>
                <p className="text-xs text-slate-400 mt-2">
                  Easily accessible location in Ratnagiri with parking and bike stands.
                </p>
              </div>
              <a
                href="https://maps.google.com/?q=AIM+Fitness+Ratnagiri"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all block text-center"
              >
                <span>View on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. TIMINGS & MEMBERSHIP ENQUIRY FORM                      */}
      {/* ========================================================= */}
      <section id="timings" className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Opening Hours</span>
              <h2 className="text-3xl font-black text-white mt-1">Gym Timings</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 flex justify-between items-center">
                <span className="font-semibold text-white">Morning Shift (Mon - Sat)</span>
                <span className="font-mono text-rose-400 font-bold">
                  {gym?.timings?.morning || '06:00 AM - 11:00 AM'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 flex justify-between items-center">
                <span className="font-semibold text-white">Evening Shift (Mon - Sat)</span>
                <span className="font-mono text-rose-400 font-bold">
                  {gym?.timings?.evening || '05:00 PM - 10:00 PM'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750 flex justify-between items-center">
                <span className="font-semibold text-white">Sunday Special</span>
                <span className="font-mono text-slate-300 font-bold">
                  {gym?.timings?.sunday || '07:00 AM - 12:00 PM'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{gym?.address || 'Ratnagiri, Maharashtra 415612'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Front Desk: {gym?.phone || '+91 9822XXXXXX'}</span>
              </div>
            </div>
          </div>

          {/* MEMBERSHIP ENQUIRY FORM */}
          <div id="enquiry" className="bg-dark-850 border border-dark-750 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div>
              <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Get In Touch</span>
              <h3 className="text-xl font-black text-white mt-1">Membership & Admission Enquiry</h3>
              <p className="text-xs text-slate-400">
                Connect directly with our Ratnagiri team to enquire about membership packages, personal coaching, and timings.
              </p>
            </div>

            {formSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center space-y-1">
                <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                <p className="font-bold">WhatsApp Enquiry Launched!</p>
                <p className="text-slate-300">Our front desk team will connect with you promptly.</p>
              </div>
            ) : (
              <form onSubmit={handleTrialSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Omkar Joshi"
                    value={trialName}
                    onChange={(e) => setTrialName(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Mobile (WhatsApp Number)</label>
                  <input
                    type="tel"
                    required
                    placeholder="9822XXXXXX"
                    value={trialPhone}
                    onChange={(e) => setTrialPhone(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fitness Goal</label>
                  <select
                    value={trialGoal}
                    onChange={(e) => setTrialGoal(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Weight Training & Muscle">Weight Training & Muscle</option>
                    <option value="Weight Loss & Cardio">Weight Loss & Cardio</option>
                    <option value="Personal Coaching">Personal Coaching</option>
                    <option value="General Health">General Health</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all mt-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send WhatsApp Enquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. FOOTER                                                */}
      {/* ========================================================= */}
      <footer className="bg-dark-950 border-t border-dark-800 py-10 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center space-x-3">
            <div className="h-10 px-2 py-1 bg-white rounded-xl shadow-md flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="AIM Fitness" className="h-full w-auto object-contain" />
            </div>
            <div>
              <div className="font-black text-white text-sm">AIM FITNESS • RATNAGIRI</div>
              <p className="text-[11px] text-slate-400">Gymming Beyond Tradition</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 font-semibold">
            <button
              onClick={() => setIsIdModalOpen(true)}
              className="hover:text-rose-400 transition-colors flex items-center gap-1.5"
            >
              <IdCard className="w-3.5 h-3.5 text-rose-500" />
              <span>Download ID Card</span>
            </button>

            <button
              onClick={() => navigate('/portal')}
              className="hover:text-rose-400 transition-colors"
            >
              Member Portal
            </button>

            <button
              onClick={() => navigate('/scan')}
              className="hover:text-rose-400 transition-colors flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Attendance Kiosk</span>
            </button>

            <a
              href="https://www.instagram.com/aimfitness_ratnagiri/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-rose-400 transition-colors flex items-center gap-1.5"
            >
              <Instagram className="w-3.5 h-3.5 text-rose-400" />
              <span>@aimfitness_ratnagiri</span>
            </a>

            <button
              onClick={() => navigate('/install')}
              className="text-rose-400 hover:underline"
            >
              Install App
            </button>

            <button
              onClick={() => navigate('/admin')}
              className="hover:text-slate-200 transition-colors"
            >
              Staff & Owner Portal
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* VIDEO POPUP MODAL                                         */}
      {/* ========================================================= */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dark-950 border border-dark-750 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-3 p-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-dark-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                AIM Fitness Facility Walkthrough
              </span>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-dark-850"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video container */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center relative">
              <video
                src="https://assets.mixkit.co/videos/preview/mixkit-man-working-out-with-dumbbells-in-a-gym-44163-large.mp4"
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Ratnagiri Gym Floor Experience</span>
              <a
                href="https://www.instagram.com/aimfitness_ratnagiri/"
                target="_blank"
                rel="noreferrer"
                className="text-rose-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Watch More on Instagram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DIGITAL MEMBER ID CARD MODAL                              */}
      {/* ========================================================= */}
      {isIdModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-dark-950 border border-dark-750 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-6 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <div className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-rose-500" />
                <span className="font-bold text-white text-base">
                  AIM Fitness Member ID Card
                </span>
              </div>
              <button
                onClick={() => {
                  setIsIdModalOpen(false);
                  setIdLookupError('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-dark-850"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Search Form */}
            <form onSubmit={handleLookupMember} className="space-y-3">
              <label className="text-xs text-slate-300 font-semibold block">
                Enter your Member ID or Registered Phone Number:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. AIM-0001 or 9730213645"
                  value={idQuery}
                  onChange={(e) => setIdQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-dark-900 border border-dark-750 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSearchingId || !idQuery.trim()}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-md shadow-rose-600/20"
                >
                  {isSearchingId ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Search</span>
                </button>
              </div>

              {idLookupError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{idLookupError}</span>
                </div>
              )}
            </form>

            {/* Render Member ID Card if found */}
            {searchedMember && (
              <div className="space-y-4 pt-1 animate-in zoom-in-95">
                {/* Physical Card Visual */}
                <div className="bg-gradient-to-br from-dark-900 via-dark-950 to-black border-2 border-rose-500/50 rounded-2xl p-5 shadow-2xl relative overflow-hidden text-left">
                  {/* Decorative gym accent glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 px-1.5 py-0.5 bg-white rounded-lg flex items-center justify-center">
                        <img src="/logo.png" alt="AIM" className="h-full w-auto object-contain" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white tracking-wider">AIM FITNESS</div>
                        <div className="text-[9px] text-slate-400 font-medium">RATNAGIRI</div>
                      </div>
                    </div>

                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      MEMBER PASS
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="text-lg font-black text-white truncate">
                        {searchedMember.full_name}
                      </div>
                      <div className="inline-block px-2 py-0.5 rounded-md bg-dark-800 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold">
                        {searchedMember.member_code}
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                        <div>Phone: <span className="text-slate-300 font-mono">+91 {searchedMember.phone}</span></div>
                        <div>Valid Till: <span className="text-rose-400 font-bold">{formatDate(searchedMember.current_due_date)}</span></div>
                      </div>
                    </div>

                    {/* QR Code Container */}
                    {idQrDataUrl && (
                      <div className="shrink-0 text-center">
                        <div className="p-1.5 bg-white rounded-xl shadow-md border border-slate-200">
                          <img
                            src={idQrDataUrl}
                            alt="Attendance QR Code"
                            className="w-24 h-24 object-contain"
                          />
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase mt-1 block">
                          SCAN FOR ENTRY
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Slogan Footer */}
                  <div className="mt-4 pt-2 border-t border-dark-850 flex items-center justify-between text-[9px] text-slate-500">
                    <span>Gymming Beyond Tradition</span>
                    <span>Aim High • Train Hard</span>
                  </div>
                </div>

                {/* Download PDF button */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    onClick={handleDownloadIdCardPdf}
                    className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official ID Card (PDF)</span>
                  </button>
                  <button
                    onClick={() => {
                      setSearchedMember(null);
                      setIdQrDataUrl('');
                      setIdQuery('');
                    }}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-300 border border-dark-750 text-xs font-semibold"
                  >
                    Search Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
