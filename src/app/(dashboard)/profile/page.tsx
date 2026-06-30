/**
 * @file src/app/(dashboard)/profile/page.tsx
 * @description Citizen Profile and Achievement Center.
 * Displays user profile, gamification points, levels, badges, activity timeline, and profile editing forms.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { RouteGuard } from '@/features/auth/components/route-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/services/firebase/firestore';
import { CivicReport } from '@/types';
import { UserRepository } from '@/features/auth/repositories/user.repository';
import { CitizenStatsService } from '@/features/reports/services/stats.service';
import { MediaService } from '@/features/media/services/media.service';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/services/firebase/auth';
import {
  Award,
  Shield,
  CheckCircle,
  FileText,
  Globe,
  Calendar,
  Phone,
  Loader2,
  Sparkles,
  MapPin,
  Camera,
  Lock,
  History,
  Zap,
  LogOut,
  LayoutDashboard,
  MessageSquare,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MapPicker from '@/components/maps/MapPicker';

export default function ProfilePage() {
  const { profile, logout, refreshProfile } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [community, setCommunity] = useState('');
  const [homeLocation, setHomeLocation] = useState<any>(null);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [saving, setSaving] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Points history state
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [loadingPointsHistory, setLoadingPointsHistory] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [showResolvedModal, setShowResolvedModal] = useState(false);

  useEffect(() => {
    if (!profile?.uid || !showPointsModal) return;

    setLoadingPointsHistory(true);
    const fetchHistory = async () => {
      try {
        const q = query(collection(db, 'users', profile.uid, 'pointsTransactions'));
        const snap = await getDocs(q);
        const items: any[] = [];
        snap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort by timestamp desc
        items.sort(
          (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
        );

        // If history is empty, generate derived/mock history matching user's current points
        if (items.length === 0) {
          // Derived from resolved reports
          const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
          for (let i = 0; i < resolvedCount; i++) {
            items.push({
              id: `derived-resolved-${i}`,
              points: 100,
              action: 'resolve',
              timestamp: new Date().toISOString(),
              description: 'Report Resolved (+100 Points)',
            });
          }

          // Remaining points as initial signup/badge rewards
          const currentPoints = (profile as any).gamification?.points || 0;
          const derivedSum = items.reduce((sum, item) => sum + item.points, 0);
          const diff = currentPoints - derivedSum;
          if (diff > 0) {
            items.push({
              id: 'derived-welcome',
              points: diff,
              action: 'welcome',
              timestamp: new Date(
                (profile as any).timestamps?.createdAt || Date.now()
              ).toISOString(),
              description: `Civic Welcome & Milestone Rewards (+${diff} Points)`,
            });
          }
        }

        setPointsHistory(items);
      } catch (err) {
        console.error('Error fetching points history:', err);
      } finally {
        setLoadingPointsHistory(false);
      }
    };
    fetchHistory();
  }, [profile?.uid, showPointsModal, reports, profile]);

  // Sync profile fields into local state when profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.displayName || '');
      setPhone(profile.phoneNumber || '');
      setAvatarUrl(profile.avatarUrl || '');
      setPreferredLanguage((profile as any).preferredLanguage || 'English');
      setCommunity((profile as any).community || '');
      setHomeLocation((profile as any).homeLocation || null);
      setState((profile as any).state || '');
      setCity((profile as any).city || '');
      setDepartment((profile as any).department || '');

      // Auto-initialize gamification stats if not present
      if (!(profile as any).gamification) {
        CitizenStatsService.initGamification(profile.uid).catch((err: unknown) =>
          console.error('Failed to initialize gamification stats:', err)
        );
      }
    }
  }, [profile]);

  // Subscribe to user reports for timeline
  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, COLLECTIONS.REPORTS),
      where('metadata.createdBy', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CivicReport[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CivicReport);
        });

        // Sort by createdAt descending
        list.sort(
          (a, b) =>
            new Date(b.timestamps?.createdAt || 0).getTime() -
            new Date(a.timestamps?.createdAt || 0).getTime()
        );
        setReports(list);
        setLoadingReports(false);

        CitizenStatsService.syncStats(profile.uid)
          .then(() => refreshProfile())
          .catch((err) => {
            console.error('Failed to sync gamification stats on snapshot update:', err);
          });
      },
      (error) => {
        console.error('Error reading reports for profile timeline:', error);
        setLoadingReports(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    setSaving(true);
    try {
      await UserRepository.updateUserProfile(profile.uid, {
        displayName: name,
        phoneNumber: phone,
        avatarUrl,
        preferredLanguage,
        community,
        homeLocation,
        state,
        city,
        department,
      } as any);
      setIsEditing(false);
      await refreshProfile();
      window.location.reload();
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!profile?.uid) return;

    setUploadingAvatar(true);
    try {
      const assets = await MediaService.uploadFiles(
        [files[0]],
        `profiles/${profile.uid}`,
        profile.uid
      );
      if (assets.length > 0) {
        const newUrl = assets[0].url;
        setAvatarUrl(newUrl);
        // Auto save to firestore profile
        await UserRepository.updateUserProfile(profile.uid, {
          avatarUrl: newUrl,
        } as any);
      }
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      alert(err.message || 'Failed to upload avatar image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Password update handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const user = auth.currentUser;
    if (!user || !user.email) {
      setPasswordError('No authenticated session found.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPasswordSuccess('Security password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password update error:', err);
      setPasswordError(
        err.message || 'Failed to update security credentials. Ensure current password is correct.'
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Gamification properties helper
  const stats = (profile as any)?.gamification || {
    points: 0,
    contributionScore: 0,
    civicScore: 0,
    level: 1,
    contributionLevel: 1,
    civicLevel: 1,
    badges: [] as string[],
    reportsSubmitted: 0,
    reportsAssigned: 0,
    reportsResolved: 0,
    reportsDuplicate: 0,
    reportsFake: 0,
    reportsVerified: 0,
    streakDays: 0,
    longestStreak: 0,
    likesReceived: 0,
    commentsPosted: 0,
    feedReputation: 0,
    achievementProgress: 0,
  };

  const allBadges = [
    {
      name: 'First Report',
      requirement: 'Submit 1 or more community reports',
      description: 'Awarded for reporting your first community incident.',
      icon: '🌱',
    },
    {
      name: 'Community Helper',
      requirement: 'Verify 5 or more community reports',
      description: 'Verified 5 or more reports submitted by fellow citizens.',
      icon: '🤝',
    },
    {
      name: 'Trusted Citizen',
      requirement: 'Reach 250 or more Civic Points',
      description: 'Reached a score of 250 points in civic participation.',
      icon: '🛡️',
    },
    {
      name: 'Civic Champion',
      requirement: 'Reach 1,000 or more Civic Points',
      description: 'Elite civic contributor with over 1,000 points.',
      icon: '👑',
    },
    {
      name: 'Bronze Resolver',
      requirement: 'Have 5 of your reports successfully resolved',
      description: 'Successfully resolved 5 community reports.',
      icon: '🥉',
    },
    {
      name: 'Silver Resolver',
      requirement: 'Have 15 of your reports successfully resolved',
      description: 'Successfully resolved 15 community reports.',
      icon: '🥈',
    },
    {
      name: 'Gold Resolver',
      requirement: 'Have 30 of your reports successfully resolved',
      description: 'Successfully resolved 30 community reports.',
      icon: '🥇',
    },
  ];

  const isCitizen = profile?.role === 'citizen';
  const isOfficer = profile?.role === 'officer';
  const isAdmin = profile?.role === 'admin';

  const themeColor = isCitizen
    ? 'text-indigo-600 dark:text-indigo-400'
    : isOfficer
      ? 'text-orange-500 dark:text-orange-400'
      : 'text-purple-600 dark:text-purple-400';

  const themeBg = isCitizen ? 'bg-indigo-500' : isOfficer ? 'bg-orange-500' : 'bg-purple-500';

  const themeBorder = isCitizen
    ? 'border-indigo-500'
    : isOfficer
      ? 'border-orange-500'
      : 'border-purple-500';

  const themeText = isCitizen
    ? 'text-indigo-650 dark:text-indigo-400'
    : isOfficer
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-purple-650 dark:text-purple-400';

  const themeBadge = isCitizen
    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-650 dark:text-indigo-400'
    : isOfficer
      ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-450'
      : 'bg-purple-500/10 border-purple-500/20 text-purple-650 dark:text-purple-450';

  const themeGlow1 = isCitizen
    ? 'bg-indigo-500/10 dark:bg-indigo-500/5'
    : isOfficer
      ? 'bg-orange-500/10 dark:bg-orange-500/5'
      : 'bg-purple-500/10 dark:bg-purple-500/5';

  const themeGlow2 = isCitizen
    ? 'bg-teal-500/10 dark:bg-teal-500/5'
    : isOfficer
      ? 'bg-amber-500/10 dark:bg-amber-500/5'
      : 'bg-indigo-500/10 dark:bg-indigo-500/5';

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
            <Link href="/" className="font-extrabold text-blue-600 tracking-wider flex items-center gap-1.5 select-none text-base">
              <span className="hidden sm:flex w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="hidden sm:inline">CivicMind</span>
              <span className="sm:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-md text-sm font-black tracking-normal">CM</span>
            </Link>
            <nav className="hidden md:flex bg-slate-100/80 p-1.5 rounded-full border border-slate-200/50 items-center gap-1 text-[10px] font-black uppercase tracking-widest relative">
              <Link
                href={
                  profile?.role === 'officer'
                    ? '/officer'
                    : profile?.role === 'admin'
                      ? '/admin'
                      : '/dashboard'
                }
                className="relative px-4 py-2 rounded-full transition-all text-slate-500 hover:text-slate-800"
              >
                <span className="relative z-10">Dashboard</span>
              </Link>
              <Link
                href="/community"
                className="relative px-4 py-2 rounded-full transition-all text-slate-500 hover:text-slate-800"
              >
                <span className="relative z-10">Community Feed</span>
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
                /* eslint-disable-next-line @next/next/no-img-element */
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
            <Button variant="ghost" size="icon" onClick={() => logout()} className="text-slate-500 hover:bg-slate-100 rounded-full">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="relative z-10 mx-auto flex w-[92%] max-w-6xl flex-1 flex-col gap-8 px-0 pt-32 pb-24 md:flex-row">
          {/* Left Panel: Profile Detail, Gamification Summary */}
          <div className="flex flex-1 flex-col gap-6">
            {/* Header info */}
            <div className="clay-card relative flex flex-col items-center gap-6 overflow-hidden p-6 md:flex-row">
              {/* Profile Avatar */}
              <div
                className={`group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 bg-slate-100 dark:bg-slate-900 ${themeBorder}`}
              >
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center font-mono text-3xl font-extrabold ${themeText}`}
                  >
                    {name?.[0]?.toUpperCase() || 'C'}
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center gap-2.5 md:justify-start">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                    {name || 'Citizen'}
                  </h1>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${themeBadge}`}
                  >
                    Level {stats.level}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile?.email}</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 md:justify-start dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {phone || 'No phone added'}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Globe className="h-3.5 w-3.5 text-slate-400" />{' '}
                    {preferredLanguage.toUpperCase()}
                  </span>
                  {(homeLocation?.formattedAddress || community) && (
                    <span
                      className="flex max-w-[280px] items-center gap-1.5 truncate font-medium md:max-w-[400px]"
                      title={homeLocation?.formattedAddress || community}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />{' '}
                      {homeLocation?.formattedAddress || community}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 self-center text-xs md:self-start"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>

            {/* Profile Editing Form */}
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex flex-col gap-6"
              >
                {/* Form 1: General Info & Image Upload */}
                <form onSubmit={handleSave} className="clay-card flex flex-col gap-4 p-6">
                  <h3 className={`text-xs font-bold tracking-wider uppercase ${themeText}`}>
                    Update Profile Details
                  </h3>

                  {/* Upload Avatar Widget */}
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-100/50 p-4 md:flex-row dark:border-white/5 dark:bg-slate-950/40">
                    <div className="text-slate-550 relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-lg font-bold dark:border-slate-800 dark:bg-slate-900">
                      {avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        (name || profile?.email || 'C').charAt(0).toUpperCase()
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/75">
                          <Loader2 className={`h-5 w-5 animate-spin ${themeText}`} />
                        </div>
                      )}
                    </div>
                    <div className="flex w-full flex-1 flex-col gap-1 text-left">
                      <span className="dark:text-slate-350 text-xs font-bold text-slate-700">
                        Profile Picture Avatar
                      </span>
                      <span className="text-[10px] text-slate-500">
                        JPG, PNG, WEBP formats. Direct Cloudinary upload.
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <label className="dark:hover:bg-slate-850 flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[10px] font-bold tracking-wider text-slate-700 uppercase transition-all hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          <Camera className="h-3.5 w-3.5 text-slate-400" /> Choose Image file
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                            disabled={uploadingAvatar}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Display Name
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Your display name"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Contact Phone
                      </label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Avatar Image URL
                      </label>
                      <Input
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Preferred Language
                      </label>
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-inner focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Malayalam">Malayalam</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Gujarati">Gujarati</option>
                        <option value="Punjabi">Punjabi</option>
                        <option value="Bengali">Bengali</option>
                        <option value="Odia">Odia</option>
                        <option value="Urdu">Urdu</option>
                      </select>
                    </div>
                    {/* Citizen role options */}
                    {profile?.role === 'citizen' && (
                      <>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Neighborhood / Community Name
                          </label>
                          <Input
                            value={community}
                            onChange={(e) => setCommunity(e.target.value)}
                            placeholder="e.g. Downtown / Indiranagar"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 font-sans md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Home / Community Location Address
                          </label>
                          {homeLocation?.formattedAddress && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-100/50 p-3.5 text-xs leading-relaxed font-medium text-slate-700 shadow-inner dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                              {homeLocation.formattedAddress}
                            </div>
                          )}
                          <MapPicker
                            initialLocation={homeLocation}
                            onLocationChange={(loc) => {
                              setHomeLocation(loc);
                              if (!community) {
                                setCommunity(loc.locality || loc.subLocality || loc.city || '');
                              }
                            }}
                          />
                        </div>
                      </>
                    )}

                    {/* Officer & Admin options */}
                    {(profile?.role === 'officer' || profile?.role === 'admin') && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Jurisdiction State *
                        </label>
                        <select
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          required
                          className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-inner focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="">Select State...</option>
                          <option value="Andhra Pradesh">Andhra Pradesh</option>
                          <option value="Telangana">Telangana</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Delhi">Delhi</option>
                        </select>
                      </div>
                    )}

                    {/* Officer specific options */}
                    {profile?.role === 'officer' && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Jurisdiction City *
                          </label>
                          <Input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                            placeholder="e.g. Hyderabad"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Department *
                          </label>
                          <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            required
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-inner focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                          >
                            <option value="">Select Department...</option>
                            <option value="Roads">Roads</option>
                            <option value="Sanitation">Sanitation</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Water Supply">Water Supply</option>
                            <option value="Drainage">Drainage</option>
                            <option value="Parks">Parks</option>
                            <option value="Traffic">Traffic</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                  <Button type="submit" size="sm" disabled={saving} className="mt-2 w-fit">
                    {saving ? 'Saving Changes...' : 'Save Preferences'}
                  </Button>
                </form>

                {/* Form 2: Password / Security credentials */}
                <form onSubmit={handleUpdatePassword} className="clay-card flex flex-col gap-4 p-6">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-500">
                    <Lock className="h-4 w-4 text-amber-500" /> Change Security Password
                  </h3>

                  {passwordError && (
                    <div className="text-red-650 rounded-2xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs dark:text-red-400">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400">
                      {passwordSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Current Password
                      </label>
                      <Input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password to authorize"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          New Password
                        </label>
                        <Input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Confirm New Password
                        </label>
                        <Input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Verify new password"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={updatingPassword}
                    className="squishy-btn mt-2 w-fit bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  >
                    {updatingPassword ? 'Updating Password...' : 'Update Credentials'}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Achievement / Points Overview Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {/* Contribution Points */}
              <div
                className="clay-card group flex cursor-pointer flex-col gap-1 p-4 transition-all select-none"
                onClick={() => setShowPointsModal(true)}
                title="View Gamification scoring breakdown"
              >
                <div className="flex items-center justify-between">
                  <span className="dark:text-slate-450 font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Contrib Points
                  </span>
                  <History className="h-3.5 w-3.5 text-slate-400 transition-all group-hover:rotate-12 group-hover:text-emerald-500 dark:group-hover:text-emerald-400" />
                </div>
                <span className="dark:text-emerald-455 mt-0.5 flex items-center gap-1.5 text-2xl font-black text-emerald-600">
                  <Zap className="h-5 w-5 text-emerald-500 transition-transform group-hover:scale-110 dark:text-emerald-400" />{' '}
                  {stats.contributionScore || 0}
                </span>
              </div>

              {/* Civic Points */}
              <div
                className="clay-card group flex cursor-pointer flex-col gap-1 p-4 transition-all select-none"
                onClick={() => setShowPointsModal(true)}
                title="View Civic Points History"
              >
                <div className="flex items-center justify-between">
                  <span className="dark:text-slate-450 font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-colors group-hover:text-blue-400">
                    Civic Points
                  </span>
                  <History className="h-3.5 w-3.5 text-slate-400 transition-all group-hover:rotate-12 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                </div>
                <span className="mt-0.5 flex items-center gap-1.5 text-2xl font-black text-blue-600 dark:text-blue-500">
                  <Sparkles className="h-5 w-5 text-blue-500 transition-transform group-hover:scale-110" />{' '}
                  {stats.civicScore || 0}
                </span>
              </div>

              {/* Contrib Level */}
              <div
                className="clay-card group flex cursor-pointer flex-col gap-1 p-4 transition-all select-none"
                onClick={() => setShowLevelModal(true)}
                title="View Level Progress"
              >
                <div className="flex items-center justify-between">
                  <span className="dark:text-slate-450 font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Contrib Level
                  </span>
                  <History className="h-3.5 w-3.5 text-slate-400 transition-all group-hover:rotate-12 group-hover:text-emerald-500 dark:group-hover:text-emerald-400" />
                </div>
                <span className="dark:text-emerald-455 mt-0.5 flex items-center gap-1.5 text-2xl font-black text-emerald-600">
                  <Shield className="text-emerald-550 h-5 w-5 transition-transform group-hover:scale-110 dark:text-emerald-400" />{' '}
                  Lvl {stats.contributionLevel || 1}
                </span>
              </div>

              {/* Civic Level */}
              <div
                className="clay-card group flex cursor-pointer flex-col gap-1 p-4 transition-all select-none"
                onClick={() => setShowLevelModal(true)}
                title="View Level Progress"
              >
                <div className="flex items-center justify-between">
                  <span className="dark:text-slate-450 font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-colors group-hover:text-blue-400">
                    Civic Level
                  </span>
                  <History className="h-3.5 w-3.5 text-slate-400 transition-all group-hover:rotate-12 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                </div>
                <span className="mt-0.5 flex items-center gap-1.5 text-2xl font-black text-blue-600 dark:text-blue-500">
                  <Award className="text-blue-550 h-5 w-5 transition-transform group-hover:scale-110 dark:text-blue-400" />{' '}
                  Lvl {stats.civicLevel || 1}
                </span>
              </div>

              {/* Submitted Reports */}
              <div
                className="clay-card group flex cursor-pointer flex-col gap-1 p-4 transition-all select-none"
                onClick={() => setShowSubmittedModal(true)}
                title="View Submitted Reports History"
              >
                <div className="flex items-center justify-between">
                  <span className="dark:text-slate-450 font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-colors group-hover:text-amber-500 dark:group-hover:text-amber-400">
                    Submitted
                  </span>
                  <History className="h-3.5 w-3.5 text-slate-400 transition-all group-hover:rotate-12 group-hover:text-amber-500 dark:group-hover:text-amber-400" />
                </div>
                <span className="mt-0.5 flex items-center gap-1.5 text-2xl font-black text-amber-600 dark:text-amber-500">
                  <FileText className="text-amber-550 h-5 w-5 transition-transform group-hover:scale-110 dark:text-amber-400" />{' '}
                  {stats.reportsSubmitted || 0}
                </span>
              </div>

              {/* Resolved Reports */}
              <div
                className="clay-card group flex cursor-pointer flex-col gap-1 p-4 transition-all select-none"
                onClick={() => setShowResolvedModal(true)}
                title="View Resolved Reports History"
              >
                <div className="flex items-center justify-between">
                  <span className="dark:text-slate-450 group-hover:text-purple-650 font-mono text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-colors dark:group-hover:text-purple-400">
                    Resolved
                  </span>
                  <History className="h-3.5 w-3.5 text-slate-400 transition-all group-hover:rotate-12 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                </div>
                <span className="mt-0.5 flex items-center gap-1.5 text-2xl font-black text-purple-600 dark:text-purple-500">
                  <CheckCircle className="text-purple-550 h-5 w-5 transition-transform group-hover:scale-110 dark:text-purple-400" />{' '}
                  {stats.reportsResolved || 0}
                </span>
              </div>
            </div>

            {/* Citizen Gamification Details Card */}
            <div className="clay-card flex flex-col gap-5 p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/50">
                <h3
                  className={`flex items-center gap-2 text-xs font-bold tracking-wider uppercase ${themeText}`}
                >
                  <Sparkles className={`h-4 w-4 fill-current/10 ${themeText}`} />
                  Civic Standing Portfolio
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${themeBadge}`}>
                  Lvl {stats.level || 1}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-xs font-medium sm:col-span-2 md:grid-cols-2">
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Total XP Points</span>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                      {stats.points || 0} PTS
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Contribution Score</span>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {stats.contributionScore || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Civic Score</span>
                    <span className="text-indigo-650 font-mono text-sm font-bold dark:text-indigo-400">
                      {stats.civicScore || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Reports Submitted</span>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                      {stats.reportsSubmitted || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Reports Resolved</span>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                      {stats.reportsResolved || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">
                      Community Verifications
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                      {stats.reportsVerified || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Active Streak</span>
                    <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      🔥 {stats.streakDays || 0} Days
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Longest Streak</span>
                    <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      🔥 {stats.longestStreak || 0} Days
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Likes Received</span>
                    <span className="dark:text-zinc-350 font-mono text-sm font-bold text-slate-700">
                      {stats.likesReceived || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Comments Posted</span>
                    <span className="dark:text-zinc-350 font-mono text-sm font-bold text-slate-700">
                      {stats.commentsPosted || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Feed Reputation</span>
                    <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      ⭐ {stats.feedReputation || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 py-1 dark:border-slate-800/50">
                    <span className="text-slate-500 dark:text-slate-400">Duplicate / Fake</span>
                    <span className="font-mono text-sm font-bold text-slate-600 dark:text-zinc-400">
                      {stats.reportsDuplicate || 0} / {stats.reportsFake || 0}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-l border-slate-100 pl-6 dark:border-slate-800/50">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-50 shadow-inner dark:border-white/5 dark:bg-slate-950/40">
                    <div className="absolute inset-1 rounded-full border border-slate-200 dark:border-zinc-800" />
                    <span className="font-mono text-xl font-extrabold text-slate-800 dark:text-white">
                      {stats.level || 1}
                    </span>
                  </div>
                  <span className="text-center text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                    Current Level
                  </span>
                </div>
              </div>
            </div>

            {/* Badges Collection Section */}
            <div className="clay-card flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-slate-850 flex items-center gap-2 text-base font-extrabold dark:text-white">
                  <Award className="h-5 w-5 text-indigo-500" />
                  Badges Portfolio
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Earn unique badges by actively participating in municipal reporting and
                  verification.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {allBadges.map((badge) => {
                  const isEarned = (stats.badges || []).includes(badge.name);
                  return (
                    <div
                      key={badge.name}
                      className={`relative flex items-center gap-3.5 rounded-2xl border p-4 transition-all ${
                        isEarned
                          ? 'border-indigo-500/25 bg-white/70 shadow-md dark:bg-slate-900/60'
                          : 'bg-slate-150/20 border-slate-200 opacity-55 dark:border-white/5 dark:bg-zinc-950/20'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold shadow-inner ${
                          isEarned
                            ? 'border border-indigo-500/20 bg-indigo-500/10 text-indigo-500'
                            : 'border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/5 dark:bg-zinc-800/40'
                        }`}
                      >
                        {badge.icon || '🏆'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`text-sm font-extrabold ${isEarned ? 'text-slate-800 dark:text-zinc-200' : 'text-slate-450 dark:text-zinc-500'}`}
                          >
                            {badge.name}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                              isEarned
                                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'dark:text-zinc-550 border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/5 dark:bg-zinc-800/50'
                            }`}
                          >
                            {isEarned ? 'Earned' : 'Locked'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-normal text-slate-500 dark:text-slate-400">
                          {badge.description}
                        </p>
                        <p className="mt-1 font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          Requirement: {badge.requirement}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel: Incident Activity Timeline */}
          <div className="clay-card flex w-full flex-col gap-4 self-start p-6 md:w-80">
            <h2 className="text-slate-850 flex items-center gap-2 text-base font-extrabold dark:text-white">
              <Calendar className={`h-5 w-5 ${themeColor}`} />
              Activity Timeline
            </h2>

            {loadingReports ? (
              <div className="flex justify-center py-10">
                <Loader2 className={`h-6 w-6 animate-spin ${themeText}`} />
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400 dark:border-white/5 dark:text-zinc-500">
                No activity records found.
              </div>
            ) : (
              <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-2">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="relative flex flex-col gap-1 border-l border-slate-200 pb-4 pl-5 last:pb-0 dark:border-white/10"
                  >
                    {/* Timeline Node dot */}
                    <div
                      className={`absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-950 ${themeBg}`}
                    />

                    <div className="flex items-center justify-between font-mono text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                      <span>
                        {new Date(report.timestamps?.createdAt || 0).toLocaleDateString()}
                      </span>
                      <span className="capitalize">{report.status}</span>
                    </div>
                    <Link
                      href={`/reports/${report.id}`}
                      className="line-clamp-1 text-xs font-extrabold text-slate-700 transition hover:text-indigo-600 dark:text-zinc-200 dark:hover:text-indigo-400"
                    >
                      {report.ai?.assistant?.title || report.metadata.title}
                    </Link>
                    <p className="dark:text-slate-450 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                      {report.ai?.assistant?.description || report.metadata.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Civic Points History Modal */}
        <AnimatePresence>
          {showPointsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/85">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="clay-card relative flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-hidden p-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`h-5 w-5 ${themeColor}`} />
                    <h2 className="text-slate-850 text-lg font-extrabold dark:text-white">
                      Civic Points Ledger
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowPointsModal(false)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto py-1 pr-1">
                  {loadingPointsHistory ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
                      <Loader2 className={`h-8 w-8 animate-spin ${themeText}`} />
                      <span className="text-xs font-bold">Retrieving points ledger...</span>
                    </div>
                  ) : pointsHistory.length === 0 ? (
                    <div className="dark:text-zinc-550 py-12 text-center text-xs font-bold text-slate-400">
                      No transactions found. Points are earned through community actions.
                    </div>
                  ) : (
                    pointsHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-100 dark:border-white/5 dark:bg-zinc-950/40 dark:hover:bg-zinc-950/60"
                      >
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                            {item.description}
                          </h4>
                          <p className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            Date: {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-bold ${
                            item.points >= 0
                              ? 'border border-emerald-500/10 bg-emerald-500/10 text-emerald-600'
                              : 'border border-rose-500/10 bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {item.points >= 0 ? `+${item.points}` : item.points} PTS
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Level Status History Modal */}
        <AnimatePresence>
          {showLevelModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/85">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="clay-card relative flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-hidden p-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-slate-850 text-lg font-extrabold dark:text-white">
                      Gamification Level Progression
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowLevelModal(false)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>

                <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto py-1 pr-1 md:grid-cols-2">
                  {/* Contribution Level */}
                  <div className="space-y-3">
                    <h3 className="dark:text-emerald-450 border-b border-slate-100 pb-1 text-xs font-bold tracking-wider text-emerald-600 uppercase dark:border-slate-800/50">
                      Contribution Level Status (Lvl {stats.contributionLevel || 1})
                    </h3>
                    {[
                      { lvl: 1, name: 'Level 1: Novice Contributor', xp: 0 },
                      { lvl: 2, name: 'Level 2: Active Helper', xp: 100 },
                      { lvl: 3, name: 'Level 3: Neighborhood Watch', xp: 250 },
                      { lvl: 4, name: 'Level 4: Community Guardian', xp: 500 },
                      { lvl: 5, name: 'Level 5: Civic Vanguard', xp: 1000 },
                    ].map((levelObj) => {
                      const isUnlocked = (stats.contributionScore || 0) >= levelObj.xp;
                      return (
                        <div
                          key={levelObj.lvl}
                          className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                            isUnlocked
                              ? 'border-emerald-500/25 bg-emerald-500/5'
                              : 'border-slate-200 bg-slate-100/50 opacity-60 dark:border-white/5 dark:bg-zinc-950/40'
                          }`}
                        >
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
                              {levelObj.name}
                            </h4>
                            <p className="mt-0.5 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                              Required: {levelObj.xp} PTS
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isUnlocked
                                ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-600'
                                : 'border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/5 dark:bg-zinc-800/40'
                            }`}
                          >
                            {isUnlocked ? 'Unlocked ✅' : 'Locked 🔒'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Civic Level */}
                  <div className="space-y-3">
                    <h3 className="border-b border-slate-100 pb-1 text-xs font-bold tracking-wider text-blue-600 uppercase dark:border-slate-800/50 dark:text-blue-400">
                      Civic Level Status (Lvl {stats.civicLevel || 1})
                    </h3>
                    {[
                      { lvl: 1, name: 'Level 1: Civic Rookie', xp: 0 },
                      { lvl: 2, name: 'Level 2: Active Citizen', xp: 100 },
                      { lvl: 3, name: 'Level 3: Trusted Citizen', xp: 250 },
                      { lvl: 4, name: 'Level 4: Civic Pillar', xp: 500 },
                      { lvl: 5, name: 'Level 5: Civic Champion', xp: 1000 },
                    ].map((levelObj) => {
                      const isUnlocked = (stats.civicScore || 0) >= levelObj.xp;
                      return (
                        <div
                          key={levelObj.lvl}
                          className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                            isUnlocked
                              ? 'border-blue-500/25 bg-blue-500/5'
                              : 'border-slate-200 bg-slate-100/50 opacity-60 dark:border-white/5 dark:bg-zinc-950/40'
                          }`}
                        >
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
                              {levelObj.name}
                            </h4>
                            <p className="mt-0.5 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                              Required: {levelObj.xp} PTS
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isUnlocked
                                ? 'border border-blue-500/25 bg-blue-500/10 text-blue-600'
                                : 'border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/5 dark:bg-zinc-800/40'
                            }`}
                          >
                            {isUnlocked ? 'Unlocked ✅' : 'Locked 🔒'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reports Submitted History Modal */}
        <AnimatePresence>
          {showSubmittedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/85">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="clay-card relative flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-hidden p-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-slate-850 text-lg font-extrabold dark:text-white">
                      Reports Submitted History
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowSubmittedModal(false)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto py-1 pr-1">
                  {reports.length === 0 ? (
                    <div className="dark:text-zinc-550 py-12 text-center text-xs font-bold text-slate-400">
                      No reports submitted yet.
                    </div>
                  ) : (
                    reports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-100 dark:border-white/5 dark:bg-zinc-950/40 dark:hover:bg-zinc-950/60"
                      >
                        <div className="min-w-0 animate-none">
                          <h4 className="block max-w-[240px] truncate text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                            {report.ai?.assistant?.title || report.metadata.title}
                          </h4>
                          <p className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            Submitted:{' '}
                            {new Date(report.timestamps?.createdAt || 0).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:border-white/5 dark:bg-zinc-800 dark:text-zinc-400">
                          {report.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reports Resolved History Modal */}
        <AnimatePresence>
          {showResolvedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/85">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="clay-card relative flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-hidden p-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-purple-550 h-5 w-5" />
                    <h2 className="text-slate-850 text-lg font-extrabold dark:text-white">
                      Reports Resolved History
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowResolvedModal(false)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto py-1 pr-1">
                  {reports.filter((r) => r.status === 'resolved').length === 0 ? (
                    <div className="dark:text-zinc-550 py-12 text-center text-xs font-bold text-slate-400">
                      No resolved reports yet.
                    </div>
                  ) : (
                    reports
                      .filter((r) => r.status === 'resolved')
                      .map((report) => (
                        <div
                          key={report.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-100 dark:border-white/5 dark:bg-zinc-950/40 dark:hover:bg-zinc-950/60"
                        >
                          <div className="min-w-0">
                            <h4 className="block max-w-[240px] truncate text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                              {report.ai?.assistant?.title || report.metadata.title}
                            </h4>
                            <p className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                              Resolved:{' '}
                              {new Date(
                                (report.timestamps as any)?.resolvedAt ||
                                  report.timestamps?.updatedAt ||
                                  0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <span className="rounded border border-purple-500/25 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-purple-500 uppercase dark:text-purple-400">
                            Resolved
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-slate-200/80 bg-white/90 backdrop-blur-2xl py-2 px-6 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <Link 
          href={
            profile?.role === 'officer' ? '/officer' : 
            profile?.role === 'admin' ? '/admin' : '/dashboard'
          } 
          className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Dashboard</span>
        </Link>
        <Link href="/community" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <MessageSquare className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Feed</span>
        </Link>
        <Link href="/reports/new" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors relative -top-3">
          <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-500/30">
            <AlertCircle className="w-6 h-6" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider mt-1 text-slate-500">Report</span>
        </Link>
        <div className="flex flex-col items-center gap-1 p-2 text-blue-600 relative">
          <UserIcon className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
        </div>
      </div>
    </RouteGuard>
  );
}
