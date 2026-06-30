/**
 * @file src/app/(dashboard)/community/page.tsx
 * @description Citizen Community Feed page.
 * Displays nearby verified reports within a configurable radius, with sorting, maps, and citizen verification controls.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { RouteGuard } from '@/features/auth/components/route-guard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/services/firebase/firestore';
import { CivicReport } from '@/types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Wrench,
  MapPin,
  Eye,
  Camera,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  Loader2,
  MessageSquare,
  Cpu,
  Check,
} from 'lucide-react';
import { ISSUE_CATEGORIES } from '@/constants';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ReportVerificationService } from '@/features/reports/services/verification.service';
import { MediaService } from '@/features/media/services/media.service';
import { NotificationService } from '@/features/reports/services/notification.service';
import { verifyVerificationPhoto } from '@/app/actions/ai.actions';
import ReporterBadge from '@/components/dashboard/ReporterBadge';

// Load Leaflet map dynamically without SSR
const CommunityMap = dynamic(() => import('@/components/maps/CommunityMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white/5 bg-zinc-900">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
          Loading Map...
        </span>
      </div>
    </div>
  ),
});

// Haversine Distance Formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CommunityFeedPage() {
  const { profile, logout } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState<number>(3); // 3 km default
  const [sortBy, setSortBy] = useState<'distance' | 'priority' | 'recency'>('recency');
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [uploadingReportId, setUploadingReportId] = useState<string | null>(null);

  // Local storage cache for voted reports to prevent duplicate voting in same session
  const [sessionVotes, setSessionVotes] = useState<Record<string, 'verify' | 'inaccurate'>>({});

  // Verification Modal States
  const [verifyingReport, setVerifyingReport] = useState<CivicReport | null>(null);
  const [verificationDecision, setVerificationDecision] = useState<'support' | 'not_found' | null>(
    null
  );
  const [verificationComment, setVerificationComment] = useState<string>('');
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);
  const [uploadingVerificationPhoto, setUploadingVerificationPhoto] = useState<boolean>(false);
  const [submittingVerification, setSubmittingVerification] = useState<boolean>(false);
  const [loadingExisting, setLoadingExisting] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // 1. Get user coordinates from profile homeLocation first, then fall back to geolocation
  useEffect(() => {
    if (profile?.homeLocation?.latitude && profile?.homeLocation?.longitude) {
      setUserCoords({
        latitude: profile.homeLocation.latitude,
        longitude: profile.homeLocation.longitude,
      });
      return;
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation failed or denied, using Bengaluru center coordinates.', error);
          setUserCoords({ latitude: 12.9716, longitude: 77.5946 });
        }
      );
    }
  }, [profile]);

  // 2. Real-time reports subscription
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.REPORTS), where('status', '!=', 'draft'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reportsList: CivicReport[] = [];
        const activeStatuses = [
          'submitted',
          'processing',
          'verified',
          'waiting_assignment',
          'assigned',
          'accepted',
          'travelling',
          'investigating',
          'repair_in_progress',
          'awaiting_verification',
          'reopened',
        ];
        snapshot.forEach((docSnap) => {
          const r = { id: docSnap.id, ...docSnap.data() } as CivicReport;
          if (activeStatuses.includes(r.status)) {
            reportsList.push(r);
          }
        });
        setReports(reportsList);
        setLoading(false);
      },
      (error) => {
        console.error('Error subscribing to reports:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getCategoryLabel = (value: string) => {
    const matched = ISSUE_CATEGORIES.find((c) => c.value === value);
    return matched ? matched.label : value;
  };

  // Helper to prioritize sorting based on Distance, Severity, Trust, Verifications, and Resolution
  const getReportRankScore = (report: any) => {
    // 1. Resolution status: active/unresolved issues MUST appear before resolved/closed issues
    const isResolvedOrClosed = ['resolved', 'closed'].includes(report.status);
    const statusScore = isResolvedOrClosed ? 0 : 10000;

    // 2. Severity: critical = 1000, high = 500, medium = 200, low = 50, unknown = 0
    const severityStr = (
      report.ai?.assistant?.severity ||
      report.ai?.verification?.priority ||
      'low'
    )
      .toLowerCase()
      .trim();
    let severityScore = 50;
    if (severityStr === 'critical') severityScore = 1000;
    else if (severityStr === 'high') severityScore = 500;
    else if (severityStr === 'medium') severityScore = 200;

    // 3. Distance: closer is better (lower distance = higher rank)
    const distanceScore = Math.max(0, radius - (report.distance || 0)) * 100;

    // 4. Trust: prioritize reports with higher AI trust scores (0.0 to 1.0)
    const trustScore = (report.ai?.verification?.trustScore || 0.5) * 200;

    // 5. Verifications: prioritize reports with more community support (supportCount - notFoundCount)
    const netVerifications = (report.supportCount || 0) - (report.notFoundCount || 0);
    const verificationsScore = netVerifications * 50;

    return statusScore + severityScore + distanceScore + trustScore + verificationsScore;
  };

  // 3. Process, Filter, and Sort Reports
  const centerLat = userCoords?.latitude ?? 37.7749;
  const centerLon = userCoords?.longitude ?? -122.4194;

  const filteredReports = reports
    .map((report) => {
      const repLat = report.location?.latitude || 0;
      const repLon = report.location?.longitude || 0;
      const distance = calculateDistance(centerLat, centerLon, repLat, repLon);
      return { ...report, distance };
    })
    .filter((report) => report.distance <= radius);

  // Apply sorting
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortBy === 'distance') {
      return a.distance - b.distance;
    }
    if (sortBy === 'priority') {
      const scoreA = getReportRankScore(a);
      const scoreB = getReportRankScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      // Secondary fallback to recency
      return (
        new Date(b.timestamps?.createdAt || 0).getTime() -
        new Date(a.timestamps?.createdAt || 0).getTime()
      );
    }
    // Default recency
    return (
      new Date(b.timestamps?.createdAt || 0).getTime() -
      new Date(a.timestamps?.createdAt || 0).getTime()
    );
  });

  // Action: Open Verification Modal and load existing verification if any
  const handleOpenVerifyModal = async (report: CivicReport) => {
    setVerifyingReport(report);
    setVerificationDecision(null);
    setVerificationComment('');
    setVerificationPhoto(null);
    setVerificationError(null);
    if (!profile?.uid) return;

    setLoadingExisting(true);
    try {
      const docRef = doc(db, COLLECTIONS.REPORTS, report.id, 'reportVerifications', profile.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setVerificationDecision(data.verificationDecision || null);
        setVerificationComment(data.verificationComment || '');
        setVerificationPhoto(data.verificationPhoto || null);
      }
    } catch (err) {
      console.error('Error loading existing verification:', err);
    } finally {
      setLoadingExisting(false);
    }
  };

  // Action: Upload verification photo to Cloudinary
  const handleVerificationPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.uid || !verifyingReport || !event.target.files || event.target.files.length === 0)
      return;
    const file = event.target.files[0];
    setUploadingVerificationPhoto(true);
    try {
      const uploadedAssets = await MediaService.uploadFiles(
        [file],
        `reports/${verifyingReport.id}/verification`,
        profile.uid
      );
      if (uploadedAssets.length > 0) {
        setVerificationPhoto(uploadedAssets[0].url);
      }
    } catch (err) {
      console.error('Verification photo upload failed:', err);
    } finally {
      setUploadingVerificationPhoto(false);
    }
  };

  // Action: Submit civic verification
  const handleSubmitVerification = async () => {
    if (!profile?.uid || !verifyingReport || !verificationDecision) return;
    setSubmittingVerification(true);
    setVerificationError(null);
    try {
      if (verificationPhoto) {
        const aiCheck = await verifyVerificationPhoto(
          profile.uid,
          verifyingReport.id,
          verificationPhoto,
          verificationComment
        );
        if (!aiCheck.success || !aiCheck.matches) {
          setVerificationError(
            aiCheck.reason ||
              'The uploaded verification photo does not seem to match the reported issue.'
          );
          setSubmittingVerification(false);
          return;
        }
      }

      await ReportVerificationService.submitVerification(
        verifyingReport.id,
        profile.uid,
        verificationDecision,
        verificationComment,
        verificationPhoto || undefined
      );
      setVerifyingReport(null);
    } catch (err) {
      console.error('Failed to submit verification:', err);
      setVerificationError(
        'Failed to submit verification: ' + (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Action: Add Supporting Image
  const handleAddImage = async (reportId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.uid || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];

    setUploadingReportId(reportId);
    try {
      const uploadedAssets = await MediaService.uploadFiles(
        [file],
        `reports/${reportId}/evidence`,
        profile.uid
      );

      if (uploadedAssets.length > 0) {
        const newAsset = uploadedAssets[0];
        const reportRef = doc(db, 'reports', reportId);
        await updateDoc(reportRef, {
          'evidence.media': arrayUnion(newAsset),
          'timestamps.updatedAt': new Date().toISOString(),
        });

        // Trigger Notification
        await NotificationService.notifyCitizenAddedEvidence(reportId);
      }
    } catch (e) {
      console.error('Failed to upload supporting evidence:', e);
    } finally {
      setUploadingReportId(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    const lowerStatus = String(status || '')
      .toLowerCase()
      .trim();
    if (lowerStatus === 'resolved') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
          Resolved
        </span>
      );
    }
    if (lowerStatus === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-400">
          Investigating
        </span>
      );
    }
    if (lowerStatus === 'verified' || lowerStatus === 'accepted' || lowerStatus === 'processed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400">
          Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[10px] font-bold text-zinc-400">
        Submitted
      </span>
    );
  };

  const renderSeverityBadge = (severity?: string) => {
    const sev = String(severity || 'low')
      .toLowerCase()
      .trim();
    if (sev === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-red-400 uppercase">
          Critical
        </span>
      );
    }
    if (sev === 'high') {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-orange-400 uppercase">
          High
        </span>
      );
    }
    if (sev === 'medium') {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-amber-400 uppercase">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-blue-400 uppercase">
        Low
      </span>
    );
  };

  const renderAiBadge = (status?: string) => {
    const st = String(status || 'processing')
      .toLowerCase()
      .trim();
    if (st === 'verified') {
      return (
        <span
          className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400 uppercase"
          title="Gemini Verified Integrity"
        >
          <Cpu className="h-2.5 w-2.5" /> AI Verified
        </span>
      );
    }
    if (st === 'requires_review') {
      return (
        <span
          className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-400 uppercase"
          title="AI Flagged for Review"
        >
          <AlertCircle className="h-2.5 w-2.5" /> AI Review
        </span>
      );
    }
    if (st === 'rejected') {
      return (
        <span
          className="inline-flex items-center gap-1 rounded border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-red-400 uppercase"
          title="AI Flagged Fake Media"
        >
          <AlertCircle className="h-2.5 w-2.5" /> AI Fake
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-zinc-400 uppercase"
        title="AI verification queue"
      >
        <Cpu className="h-2.5 w-2.5 animate-pulse text-blue-400" /> AI Triage
      </span>
    );
  };

  return (
    <RouteGuard allowedRoles={['citizen', 'officer', 'admin']}>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 selection:bg-indigo-500/20 selection:text-slate-900 relative overflow-x-hidden font-sans">
        {/* Ambient Background Data Stream Effects */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-65">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-200/30 blur-[120px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-200/20 blur-[150px] animate-blob animation-delay-2000" />
        </div>

        {/* Floating Glassmorphic Navigation Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3.5 max-w-6xl mx-auto bg-white/80 border border-white/60 backdrop-blur-2xl rounded-full mt-6 w-[92%] shadow-[0_8px_30px_rgb(163,177,198,0.2)] transition-transform duration-200">
          <div className="flex items-center gap-6">
            <span className="font-extrabold text-blue-600 tracking-wider flex items-center gap-1.5 select-none text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              CivicMind
            </span>
            <nav className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-widest">
              <Link
                href={
                  profile?.role === 'officer'
                    ? '/officer'
                    : profile?.role === 'admin'
                      ? '/admin'
                      : '/dashboard'
                }
                className="text-slate-400 hover:text-slate-800 transition"
              >
                Dashboard
              </Link>
              <Link href="/community" className="text-blue-600 border-b-2 border-blue-500 pb-1">
                Community Feed
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="flex items-center gap-2 hover:opacity-80 transition"
              title="View Profile"
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full border border-white/80 object-cover shadow-sm"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 text-xs font-bold font-mono">
                  {profile?.displayName?.[0]?.toUpperCase() || 'C'}
                </div>
              )}
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 pt-36 pb-24 lg:flex-row relative z-10">
          {/* Left panel: Filters & Feed Cards */}
          <div className="flex max-h-[82vh] flex-1 flex-col gap-6 overflow-y-auto pr-2">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-800">
                Citizen Community Feed
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Explore, verify, and track reports submitted in your neighborhood in real-time.
              </p>
            </div>

            {/* Controls Bar */}
            <div className="clay-card flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex w-full items-center gap-4 md:w-auto">
                <div className="flex w-full flex-col gap-1 md:w-48">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Radius Limit ({radius}km)
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="mr-2 font-mono text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Sort By
                </span>
                {(['recency', 'distance', 'priority'] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={sortBy === mode ? 'primary' : 'outline'}
                    onClick={() => setSortBy(mode)}
                    className={`text-xs capitalize ${sortBy === mode ? '' : 'text-slate-600'}`}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            {/* Feed Cards list */}
            {loading ? (
              <div className="flex flex-1 items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              </div>
            ) : sortedReports.length === 0 ? (
              <div className="clay-card p-12 text-center flex flex-col items-center justify-center gap-4">
                <MapPin className="h-10 w-10 animate-pulse text-slate-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">No verified reports nearby</h3>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed font-semibold text-slate-500">
                    No active incident reports match your configurable radius of {radius}km.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {sortedReports.map((report) => {
                    const firstImage = report.evidence?.media?.[0]?.url;
                    const mediaCount = report.evidence?.media?.length || 0;

                    return (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group relative overflow-hidden clay-card transition-all duration-200 hover:bg-white/95"
                      >
                        {/* Glow indicator line */}
                        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-transparent transition-all group-hover:bg-blue-500" />

                        <div className="flex flex-col gap-5 p-5 md:flex-row">
                          {/* Image Column */}
                          <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 md:w-36">
                            {firstImage ? (
                              <>
                                <img
                                  src={firstImage}
                                  alt="Incident"
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                                {mediaCount > 1 && (
                                  <span className="absolute right-1.5 bottom-1.5 rounded border border-white/10 bg-black/75 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white uppercase backdrop-blur-sm">
                                    +{mediaCount - 1} photos
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                                <Camera className="h-8 w-8" />
                              </div>
                            )}
                          </div>

                          {/* Content Column */}
                          <div className="flex min-w-0 flex-1 flex-col justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded bg-blue-100/70 border border-blue-200/50 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-blue-650 uppercase">
                                  {getCategoryLabel(
                                    report.ai?.assistant?.category || report.metadata.category
                                  )}
                                </span>
                                {renderStatusBadge(report.status)}
                                {renderSeverityBadge(
                                  report.ai?.assistant?.severity ||
                                    report.ai?.verification?.priority ||
                                    undefined
                                )}
                                {renderAiBadge(report.ai?.verification?.status)}
                                {report.metadata.createdBy && (
                                  <ReporterBadge userId={report.metadata.createdBy} />
                                )}
                                <span className="ml-auto font-mono text-[11px] font-bold text-slate-500">
                                  {report.distance.toFixed(1)} km away
                                </span>
                              </div>
                              <h3 className="mt-1 truncate text-lg font-black text-slate-800 transition group-hover:text-blue-650">
                                {report.ai?.assistant?.title || report.metadata.title}
                              </h3>
                              <p className="line-clamp-2 text-xs leading-relaxed font-medium text-slate-500">
                                {report.ai?.assistant?.description || report.metadata.description}
                              </p>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-3 text-xs text-slate-500 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                                Trust:{' '}
                                <strong className="font-bold text-emerald-600">
                                  {Math.round((report.ai?.verification?.trustScore ?? 0.5) * 100)}%
                                </strong>
                              </span>
                              <span
                                className="flex items-center gap-1.5"
                                title="Community verifications (Confirm vs Not Found)"
                              >
                                <ThumbsUp className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                                Verifications:{' '}
                                <strong className="font-bold text-blue-600">
                                  {report.supportCount || 0}
                                </strong>
                                <span className="text-slate-300">/</span>
                                <strong className="font-bold text-rose-500">
                                  {report.notFoundCount || 0}
                                </strong>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                Comments:{' '}
                                <strong className="font-bold text-slate-600">
                                  {report.commentsCount || 0}
                                </strong>
                              </span>
                              <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-slate-400">
                                {new Date(report.timestamps?.createdAt || 0).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Drawer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
                          <div className="flex items-center gap-2">
                            {profile?.role === 'citizen' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenVerifyModal(report)}
                                className="h-8 border-slate-200 bg-white text-xs hover:bg-slate-100 text-slate-700"
                              >
                                <ShieldAlert className="mr-1.5 h-3.5 w-3.5 shrink-0 text-blue-500" />{' '}
                                Verify Report
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <Link href={`/reports/${report.id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-blue-600 hover:bg-blue-50"
                              >
                                Details & Comments ({report.commentsCount || 0}){' '}
                                <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right panel: Geospatial Map View */}
          <div className="clay-card relative h-[300px] w-full shrink-0 overflow-hidden lg:h-[82vh] lg:w-[480px]">
            <CommunityMap
              center={[centerLat, centerLon]}
              reports={sortedReports}
              radiusKm={radius}
            />
          </div>
        </main>
      </div>

      {verifyingReport && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-lg font-extrabold text-white">Civic Verification</h3>
              <button
                onClick={() => setVerifyingReport(null)}
                className="text-zinc-550 hover:text-zinc-350 text-xs font-bold transition"
              >
                Close
              </button>
            </div>

            {loadingExisting ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-xs text-zinc-500">Checking your verification history...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="mb-1 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                    Target Incident
                  </span>
                  <p className="truncate text-sm font-bold text-white">
                    {verifyingReport.ai?.assistant?.title || verifyingReport.metadata.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {verifyingReport.location?.formattedAddress}
                  </p>
                </div>

                {/* Decision Choice */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                    Your Decision *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVerificationDecision('support')}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition-all ${
                        verificationDecision === 'support'
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                          : 'border-white/5 bg-zinc-950/45 text-zinc-400 hover:border-emerald-500/20 hover:bg-zinc-950'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4 shrink-0" />
                      <span>Confirm Issue Exists</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationDecision('not_found')}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition-all ${
                        verificationDecision === 'not_found'
                          ? 'border-rose-500 bg-rose-500/15 text-rose-400'
                          : 'border-white/5 bg-zinc-950/45 text-zinc-400 hover:border-rose-500/20 hover:bg-zinc-950'
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4 shrink-0" />
                      <span>Issue Not Found</span>
                    </button>
                  </div>
                </div>

                {/* Comment Textarea */}
                <div className="space-y-1.5">
                  <label className="text-zinc-550 block text-[10px] font-bold tracking-widest uppercase">
                    Verification Comment (Optional)
                  </label>
                  <textarea
                    value={verificationComment}
                    onChange={(e) => setVerificationComment(e.target.value)}
                    placeholder="Describe current status, changes, or extra info..."
                    className="placeholder-zinc-650 h-20 w-full resize-none rounded-xl border border-white/5 bg-zinc-950 px-3 py-2 text-xs font-medium text-white transition-all outline-none focus:border-blue-500/30"
                  />
                </div>

                {/* Required Photo Attachment */}
                <div className="space-y-1.5">
                  <label className="text-zinc-550 block text-[10px] font-bold tracking-widest uppercase">
                    Attach Current Photo (Required)
                  </label>

                  {verificationPhoto ? (
                    <div className="group/img relative h-32 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                      <img
                        src={verificationPhoto}
                        alt="Verification"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setVerificationPhoto(null)}
                        className="absolute top-2 right-2 rounded-md bg-black/80 px-2.5 py-1 text-[10px] text-zinc-400 transition hover:bg-black hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-zinc-950/20 transition hover:border-blue-500/30 hover:bg-zinc-950/40">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        {uploadingVerificationPhoto ? (
                          <>
                            <Loader2 className="mb-1 h-5 w-5 animate-spin text-blue-500" />
                            <p className="text-[10px] font-semibold text-zinc-500">
                              Uploading photo...
                            </p>
                          </>
                        ) : (
                          <>
                            <Camera className="mb-1 h-5 w-5 text-zinc-500" />
                            <p className="text-[10px] font-semibold text-zinc-500">
                              Upload current scene photo
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingVerificationPhoto}
                        onChange={handleVerificationPhotoUpload}
                      />
                    </label>
                  )}
                </div>

                {verificationError && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 font-sans text-[11px] leading-relaxed text-rose-400">
                    <span className="mb-0.5 block font-bold text-rose-300">
                      AI Verification Check Failed
                    </span>
                    {verificationError}
                  </div>
                )}

                {/* Submit / Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setVerifyingReport(null)}
                    variant="outline"
                    className="text-zinc-350 flex-1 border-white/10 text-xs font-semibold hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={
                      !verificationDecision ||
                      !verificationPhoto ||
                      submittingVerification ||
                      uploadingVerificationPhoto
                    }
                    isLoading={submittingVerification}
                    className="flex-1 bg-blue-600 text-xs font-bold text-white hover:bg-blue-500"
                  >
                    Submit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </RouteGuard>
  );
}
