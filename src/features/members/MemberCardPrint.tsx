import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { getMemberById, getGymSettings } from '@/db/repository';
import { generateQrToken } from '@/lib/qrToken';
import { formatDate } from '@/lib/dateUtils';
import type { Member, Gym } from '@/types';

export const MemberCardPrint: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<Member | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [m, g] = await Promise.all([getMemberById(id), getGymSettings()]);
        setMember(m || null);
        setGym(g || null);

        if (m && g) {
          const token = await generateQrToken(g.id, m.id, g.qr_secret);
          const qrUrl = await QRCode.toDataURL(token, {
            width: 300,
            margin: 1,
            color: {
              dark: '#0f1117',
              light: '#ffffff',
            },
          });
          setQrDataUrl(qrUrl);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (!member || !gym || !cardRef.current) return;

    // Create jsPDF instance (Standard ID-1 card size: 85.6mm x 54mm)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54],
    });

    // Dark background
    pdf.setFillColor(15, 17, 23); // #0f1117
    pdf.rect(0, 0, 85.6, 54, 'F');

    // Orange header banner
    pdf.setFillColor(249, 115, 22); // #f97316
    pdf.rect(0, 0, 85.6, 11, 'F');

    // Header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('AIM FITNESS', 4, 7);

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text('RATNAGIRI • MEMBERSHIP CARD', 81, 7, { align: 'right' });

    // Member Name & Code
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(member.full_name.substring(0, 24), 4, 18);

    pdf.setTextColor(249, 115, 22);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(member.member_code, 4, 23);

    // Member details
    pdf.setTextColor(148, 163, 184); // Slate 400
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text(`Phone: +91 ${member.phone}`, 4, 29);
    pdf.text(`Joined: ${formatDate(member.join_date)}`, 4, 33);
    pdf.text(`Due Date: ${formatDate(member.current_due_date)}`, 4, 37);

    // Gym Contact
    pdf.setTextColor(203, 213, 225);
    pdf.setFontSize(5.5);
    pdf.text(`Gym Contact: ${gym.phone || '+91 9822XXXXXX'}`, 4, 45);
    pdf.text('Aim High. Train Hard. Stay Fit.', 4, 49);

    // QR Code on right side
    if (qrDataUrl) {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(54, 14, 28, 28, 2, 2, 'F');
      pdf.addImage(qrDataUrl, 'PNG', 55, 15, 26, 26);

      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(5);
      pdf.text('SCAN FOR CHECK-IN', 68, 45, { align: 'center' });
    }

    pdf.save(`AIM_Fitness_Card_${member.member_code}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-aim-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!member || !gym) {
    return (
      <div className="bg-dark-850 border border-dark-750 rounded-2xl p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Member not found</h2>
        <button
          onClick={() => navigate('/admin/members')}
          className="mt-4 px-4 py-2 bg-aim-500 text-white rounded-xl text-xs font-bold"
        >
          Return to Members
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
      {/* Top action buttons (hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(`/admin/members/${member.id}`)}
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Member Profile</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-aim-400" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-aim-500 hover:bg-aim-600 text-white shadow-lg shadow-aim-500/30 flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Card</span>
          </button>
        </div>
      </div>

      <div className="text-center print:hidden">
        <h1 className="text-xl font-black text-white">Official AIM Fitness Member Card</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Standard CR80 ID Badge Format • Anti-tamper Signed QR Code
        </p>
      </div>

      {/* PRINTABLE CARD CONTAINER */}
      <div className="flex justify-center py-4">
        <div
          ref={cardRef}
          id="printable-member-card"
          className="w-[380px] h-[240px] sm:w-[420px] sm:h-[260px] bg-dark-950 rounded-2xl border-2 border-dark-750 shadow-2xl relative overflow-hidden flex flex-col justify-between text-white p-5 print:border-none print:shadow-none print:m-0"
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-aim-500/20 border border-aim-500/40 flex items-center justify-center font-black text-aim-500 text-xs">
                AIM
              </div>
              <div>
                <span className="font-black text-sm tracking-wider text-white">AIM FITNESS</span>
                <span className="block text-[9px] uppercase tracking-widest text-aim-400 font-semibold">
                  Ratnagiri
                </span>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-aim-500/20 text-aim-400 border border-aim-500/30 font-bold">
              {member.member_code}
            </span>
          </div>

          {/* Center Body: Photo, Info, and QR Code */}
          <div className="flex items-center justify-between gap-4 py-2">
            {/* Left Column: Photo & Details */}
            <div className="flex items-center gap-3.5 min-w-0">
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.full_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-dark-700 shadow shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-dark-800 border-2 border-dark-700 text-aim-400 flex items-center justify-center font-black text-2xl shrink-0">
                  {member.full_name.charAt(0)}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  {member.full_name}
                </h2>
                <div className="text-[11px] text-slate-400 space-y-0.5 mt-0.5">
                  <div>+91 {member.phone}</div>
                  <div>Valid until: <strong className="text-aim-400">{formatDate(member.current_due_date)}</strong></div>
                </div>
              </div>
            </div>

            {/* Right Column: QR Code */}
            <div className="flex flex-col items-center shrink-0">
              <div className="p-1.5 bg-white rounded-xl shadow-md">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Check-in QR"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                  />
                )}
              </div>
              <span className="text-[8px] tracking-wider text-slate-400 uppercase font-bold mt-1">
                Scan Check-In
              </span>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="border-t border-dark-800 pt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>{gym.address || 'Ratnagiri, Maharashtra'}</span>
            <span className="font-semibold text-slate-300">Aim High. Train Hard. Stay Fit.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
