'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  startAfter,
  Timestamp
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  Shield,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Users,
  Activity,
  FileText,
  Download,
  Upload,
  Settings,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Calendar,
  Database,
  Server,
  Wifi,
  WifiOff,
  Fingerprint,
  Scan,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  BellRing,
  Mail,
  Phone,
  MessageSquare,
  Zap,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Hash,
  Binary,
  Code,
  Terminal,
  Bug,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  X,
  Save,
  RotateCcw,
  CheckCheck,
  AlertCircle,
  Crown,
  UserCheck,
  UserX
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Types and Interfaces
interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'permission_change' | 
        'file_access' | 'file_share' | 'data_export' | 'encryption_key_rotation' | 
        'suspicious_activity' | 'policy_violation' | 'system_breach' | 'compliance_check';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  teamId?: string;
  spaceId?: string;
  resourceId?: string;
  resourceType?: string;
  description: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    region: string;
    city: string;
    coordinates?: [number, number];
  };
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    fingerprint: string;
  };
  timestamp: any;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: any;
  resolutionNotes?: string;
  alertsSent: string[];
  complianceFlags: string[];
}

interface EncryptionKey {
  id: string;
  algorithm: string;
  keySize: number;
  purpose: 'data' | 'communication' | 'backup' | 'authentication';
  createdAt: any;
  expiresAt?: any;
  status: 'active' | 'expired' | 'revoked' | 'pending_rotation';
  rotationSchedule?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  usageCount: number;
  lastUsed?: any;
  createdBy: string;
  metadata: {
    scope: string[];
    permissions: string[];
    tags: string[];
  };
}

interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  type: 'access_control' | 'data_protection' | 'authentication' | 'compliance' | 'network';
  rules: SecurityRule[];
  isActive: boolean;
  priority: number;
  scope: {
    teams: string[];
    users: string[];
    resources: string[];
  };
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  lastApplied?: any;
  violationCount: number;
}

interface SecurityRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'require_approval' | 'log_only' | 'notify';
  parameters: any;
  weight: number;
}

interface ComplianceReport {
  id: string;
  standard: 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'ISO27001' | 'CCPA';
  status: 'compliant' | 'non_compliant' | 'partial' | 'pending_review';
  score: number;
  requirements: ComplianceRequirement[];
  generatedAt: any;
  generatedBy: string;
  reviewedBy?: string;
  reviewedAt?: any;
  nextReviewDate: any;
  evidence: ComplianceEvidence[];
}

interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  status: 'met' | 'not_met' | 'partial' | 'not_applicable';
  evidence: string[];
  notes?: string;
  lastChecked: any;
}

interface ComplianceEvidence {
  id: string;
  type: 'document' | 'audit_log' | 'screenshot' | 'configuration' | 'policy';
  title: string;
  description: string;
  url?: string;
  content?: string;
  collectedAt: any;
  expiresAt?: any;
}

interface SecurityNotification {
  id: string;
  type: 'security_alert' | 'policy_violation' | 'compliance_issue' | 'key_expiration' | 'suspicious_activity';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  recipients: string[];
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
  triggeredBy: string;
  eventId?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: any;
  sentAt: any;
  deliveryStatus: {
    email?: 'sent' | 'delivered' | 'failed';
    sms?: 'sent' | 'delivered' | 'failed';
    push?: 'sent' | 'delivered' | 'failed';
    in_app?: 'sent' | 'read' | 'dismissed';
  };
}

// Encryption utilities
class EncryptionManager {
  private static instance: EncryptionManager;
  private keys: Map<string, CryptoKey> = new Map();

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  async generateKey(algorithm: string = 'AES-GCM', keySize: number = 256): Promise<CryptoKey> {
    const key = await crypto.subtle.generateKey(
      {
        name: algorithm,
        length: keySize,
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    const keyId = uuidv4();
    this.keys.set(keyId, key);
    
    // Store key metadata in database
    await this.storeKeyMetadata(keyId, algorithm, keySize);
    
    return key;
  }

  async encrypt(data: string, keyId?: string): Promise<{ encrypted: string; iv: string; keyId: string }> {
    let key: CryptoKey;
    let actualKeyId = keyId;

    if (keyId && this.keys.has(keyId)) {
      key = this.keys.get(keyId)!;
    } else {
      key = await this.generateKey();
      actualKeyId = Array.from(this.keys.entries()).find(([, k]) => k === key)?.[0] || '';
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    return {
      encrypted: Array.from(new Uint8Array(encrypted))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      iv: Array.from(iv)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''),
      keyId: actualKeyId
    };
  }

  async decrypt(encrypted: string, iv: string, keyId: string): Promise<string> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error('Encryption key not found');
    }

    const encryptedData = new Uint8Array(
      encrypted.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    const ivData = new Uint8Array(
      iv.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  }

  private async storeKeyMetadata(keyId: string, algorithm: string, keySize: number) {
    const keyData: Partial<EncryptionKey> = {
      id: keyId,
      algorithm,
      keySize,
      purpose: 'data',
      createdAt: serverTimestamp(),
      status: 'active',
      usageCount: 0,
      createdBy: auth.currentUser?.uid || 'system',
      metadata: {
        scope: ['global'],
        permissions: ['encrypt', 'decrypt'],
        tags: ['auto-generated']
      }
    };

    await addDoc(collection(db, 'encryptionKeys'), keyData);
  }

  async rotateKey(keyId: string): Promise<string> {
    const oldKey = this.keys.get(keyId);
    if (!oldKey) {
      throw new Error('Key not found for rotation');
    }

    // Generate new key
    const newKey = await this.generateKey();
    const newKeyId = Array.from(this.keys.entries()).find(([, k]) => k === newKey)?.[0] || '';

    // Mark old key as expired
    const oldKeyDoc = await getDocs(
      query(collection(db, 'encryptionKeys'), where('id', '==', keyId))
    );
    
    if (!oldKeyDoc.empty) {
      await updateDoc(oldKeyDoc.docs[0].ref, {
        status: 'expired',
        expiresAt: serverTimestamp()
      });
    }

    // Remove old key from memory
    this.keys.delete(keyId);

    return newKeyId;
  }
}

// Audit Logger
class AuditLogger {
  private static instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async logEvent(
    type: SecurityEvent['type'],
    description: string,
    details: any = {},
    severity: SecurityEvent['severity'] = 'low'
  ): Promise<void> {
    if (!auth.currentUser) return;

    const deviceInfo = this.getDeviceInfo();
    const ipAddress = await this.getIPAddress();
    const location = await this.getLocation(ipAddress);

    const event: Partial<SecurityEvent> = {
      type,
      severity,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || 'Unknown',
      userEmail: auth.currentUser.email || '',
      userRole: 'user', // Would need to fetch from user profile
      description,
      details,
      ipAddress,
      userAgent: navigator.userAgent,
      location,
      deviceInfo,
      timestamp: serverTimestamp(),
      resolved: false,
      alertsSent: [],
      complianceFlags: []
    };

    await addDoc(collection(db, 'securityEvents'), event);

    // Check if this event requires immediate notification
    if (severity === 'high' || severity === 'critical') {
      await this.triggerSecurityAlert(event as SecurityEvent);
    }
  }

  private getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    let os = 'Unknown';
    let browser = 'Unknown';

    // Detect device type
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detect OS
    if (/Windows/.test(userAgent)) os = 'Windows';
    else if (/Mac/.test(userAgent)) os = 'macOS';
    else if (/Linux/.test(userAgent)) os = 'Linux';
    else if (/Android/.test(userAgent)) os = 'Android';
    else if (/iOS/.test(userAgent)) os = 'iOS';

    // Detect browser
    if (/Chrome/.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/.test(userAgent)) browser = 'Firefox';
    else if (/Safari/.test(userAgent)) browser = 'Safari';
    else if (/Edge/.test(userAgent)) browser = 'Edge';

    return {
      type: deviceType,
      os,
      browser,
      fingerprint: this.generateFingerprint()
    };
  }

  private generateFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    return btoa(fingerprint).slice(0, 32);
  }

  private async getIPAddress(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  private async getLocation(ip: string) {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json();
      return {
        country: data.country_name,
        region: data.region,
        city: data.city,
        coordinates: [data.latitude, data.longitude]
      };
    } catch {
      return undefined;
    }
  }

  private async triggerSecurityAlert(event: SecurityEvent) {
    const notification: Partial<SecurityNotification> = {
      type: 'security_alert',
      severity: event.severity === 'critical' ? 'critical' : 'error',
      title: `Security Alert: ${event.type.replace(/_/g, ' ').toUpperCase()}`,
      message: event.description,
      recipients: ['admin@example.com'], // Would fetch admin emails
      channels: ['email', 'in_app'],
      triggeredBy: event.userId,
      eventId: event.id,
      acknowledged: false,
      sentAt: serverTimestamp(),
      deliveryStatus: {}
    };

    await addDoc(collection(db, 'securityNotifications'), notification);
  }
}

// Security Analytics
class SecurityAnalytics {
  private static instance: SecurityAnalytics;

  static getInstance(): SecurityAnalytics {
    if (!SecurityAnalytics.instance) {
      SecurityAnalytics.instance = new SecurityAnalytics();
    }
    return SecurityAnalytics.instance;
  }

  async detectAnomalies(): Promise<SecurityEvent[]> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get recent security events
    const eventsQuery = query(
      collection(db, 'securityEvents'),
      where('timestamp', '>=', Timestamp.fromDate(oneWeekAgo)),
      orderBy('timestamp', 'desc')
    );

    const eventsSnapshot = await getDocs(eventsQuery);
    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SecurityEvent[];

    const anomalies: SecurityEvent[] = [];

    // Detect multiple failed logins
    const failedLogins = events.filter(e => e.type === 'failed_login');
    const failedLoginsByUser = this.groupBy(failedLogins, 'userId');
    
    Object.entries(failedLoginsByUser).forEach(([userId, userFailedLogins]) => {
      if (userFailedLogins.length > 5) {
        anomalies.push(...userFailedLogins.slice(-3)); // Last 3 attempts
      }
    });

    // Detect unusual access patterns
    const accessEvents = events.filter(e => e.type === 'file_access');
    const accessByUser = this.groupBy(accessEvents, 'userId');
    
    Object.entries(accessByUser).forEach(([userId, userAccess]) => {
      const avgAccessPerDay = userAccess.length / 7;
      const todayAccess = userAccess.filter(e => 
        e.timestamp?.toDate?.()?.toDateString() === now.toDateString()
      );
      
      if (todayAccess.length > avgAccessPerDay * 3) {
        anomalies.push(...todayAccess.slice(-5)); // Last 5 access events
      }
    });

    // Detect geographic anomalies
    const loginEvents = events.filter(e => e.type === 'login');
    const loginsByUser = this.groupBy(loginEvents, 'userId');
    
    Object.entries(loginsByUser).forEach(([userId, userLogins]) => {
      const countries = new Set(userLogins.map(e => e.location?.country).filter(Boolean));
      if (countries.size > 2) {
        anomalies.push(...userLogins.slice(-2)); // Last 2 logins
      }
    });

    return anomalies;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const value = item[key] as string;
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  async generateRiskScore(userId: string): Promise<number> {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const userEventsQuery = query(
      collection(db, 'securityEvents'),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(oneMonthAgo))
    );

    const eventsSnapshot = await getDocs(userEventsQuery);
    const events = eventsSnapshot.docs.map(doc => doc.data()) as SecurityEvent[];

    let riskScore = 0;

    // Base risk factors
    const failedLogins = events.filter(e => e.type === 'failed_login').length;
    const suspiciousActivities = events.filter(e => e.type === 'suspicious_activity').length;
    const policyViolations = events.filter(e => e.type === 'policy_violation').length;

    riskScore += failedLogins * 5;
    riskScore += suspiciousActivities * 10;
    riskScore += policyViolations * 15;

    // Geographic risk
    const countries = new Set(events.map(e => e.location?.country).filter(Boolean));
    if (countries.size > 3) riskScore += 20;

    // Device risk
    const devices = new Set(events.map(e => e.deviceInfo?.fingerprint).filter(Boolean));
    if (devices.size > 5) riskScore += 15;

    // Time-based risk
    const nightLogins = events.filter(e => {
      const hour = e.timestamp?.toDate?.()?.getHours();
      return hour !== undefined && (hour < 6 || hour > 22);
    }).length;
    riskScore += nightLogins * 2;

    return Math.min(riskScore, 100); // Cap at 100
  }
}

interface SecurityDashboardProps {
  teamId?: string;
}

export function SecurityDashboard({ teamId }: SecurityDashboardProps) {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState('overview');
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [encryptionKeys, setEncryptionKeys] = useState<EncryptionKey[]>([]);
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [anomalies, setAnomalies] = useState<SecurityEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined);

  // Security metrics
  const [securityMetrics, setSecurityMetrics] = useState({
    totalEvents: 0,
    criticalEvents: 0,
    resolvedEvents: 0,
    activeKeys: 0,
    expiredKeys: 0,
    avgRiskScore: 0,
    complianceScore: 0
  });

  const auditLogger = AuditLogger.getInstance();
  const encryptionManager = EncryptionManager.getInstance();
  const securityAnalytics = SecurityAnalytics.getInstance();

  useEffect(() => {
    if (!user) return;

    // Load security events
    const eventsQuery = query(
      collection(db, 'securityEvents'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SecurityEvent[];

      setSecurityEvents(events);
      updateMetrics(events);
    });

    // Load encryption keys
    const keysQuery = query(
      collection(db, 'encryptionKeys'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeKeys = onSnapshot(keysQuery, (snapshot) => {
      const keys = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EncryptionKey[];

      setEncryptionKeys(keys);
    });

    // Load notifications
    const notificationsQuery = query(
      collection(db, 'securityNotifications'),
      where('acknowledged', '==', false),
      orderBy('sentAt', 'desc'),
      limit(20)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SecurityNotification[];

      setNotifications(notifs);
    });

    // Detect anomalies
    securityAnalytics.detectAnomalies().then(setAnomalies);

    setLoading(false);

    return () => {
      unsubscribeEvents();
      unsubscribeKeys();
      unsubscribeNotifications();
    };
  }, [user]);

  const updateMetrics = (events: SecurityEvent[]) => {
    const totalEvents = events.length;
    const criticalEvents = events.filter(e => e.severity === 'critical').length;
    const resolvedEvents = events.filter(e => e.resolved).length;
    
    setSecurityMetrics(prev => ({
      ...prev,
      totalEvents,
      criticalEvents,
      resolvedEvents,
      complianceScore: Math.round((resolvedEvents / Math.max(totalEvents, 1)) * 100)
    }));
  };

  // Generate new encryption key
  const generateNewKey = async () => {
    try {
      await encryptionManager.generateKey();
      toast({
        title: "Encryption key generated",
        description: "New encryption key has been created successfully.",
      });
    } catch (error) {
      console.error('Error generating key:', error);
      toast({
        title: "Error",
        description: "Failed to generate encryption key.",
        variant: "destructive"
      });
    }
  };

  // Rotate encryption key
  const rotateKey = async (keyId: string) => {
    try {
      await encryptionManager.rotateKey(keyId);
      toast({
        title: "Key rotated",
        description: "Encryption key has been rotated successfully.",
      });
    } catch (error) {
      console.error('Error rotating key:', error);
      toast({
        title: "Error",
        description: "Failed to rotate encryption key.",
        variant: "destructive"
      });
    }
  };

  // Resolve security event
  const resolveEvent = async (eventId: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'securityEvents', eventId), {
        resolved: true,
        resolvedBy: user!.uid,
        resolvedAt: serverTimestamp(),
        resolutionNotes: notes
      });

      toast({
        title: "Event resolved",
        description: "Security event has been marked as resolved.",
      });

      setSelectedEvent(null);
    } catch (error) {
      console.error('Error resolving event:', error);
      toast({
        title: "Error",
        description: "Failed to resolve security event.",
        variant: "destructive"
      });
    }
  };

  // Acknowledge notification
  const acknowledgeNotification = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'securityNotifications', notificationId), {
        acknowledged: true,
        acknowledgedBy: user!.uid,
        acknowledgedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error acknowledging notification:', error);
    }
  };

  // Filter security events
  const filteredEvents = securityEvents.filter(event => {
    const matchesSearch = !searchQuery || 
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.userName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
    
    const matchesDate = !dateRange || (
      event.timestamp?.toDate?.() >= dateRange.from &&
      event.timestamp?.toDate?.() <= dateRange.to
    );
    
    return matchesSearch && matchesSeverity && matchesDate;
  });

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get event icon
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login': return <User className="h-4 w-4" />;
      case 'logout': return <User className="h-4 w-4" />;
      case 'failed_login': return <UserX className="h-4 w-4" />;
      case 'password_change': return <Key className="h-4 w-4" />;
      case 'permission_change': return <Shield className="h-4 w-4" />;
      case 'file_access': return <FileText className="h-4 w-4" />;
      case 'file_share': return <ExternalLink className="h-4 w-4" />;
      case 'data_export': return <Download className="h-4 w-4" />;
      case 'suspicious_activity': return <AlertTriangle className="h-4 w-4" />;
      case 'policy_violation': return <ShieldAlert className="h-4 w-4" />;
      case 'system_breach': return <ShieldX className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Security Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage security across your organization</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button onClick={generateNewKey}>
            <Key className="h-4 w-4 mr-2" />
            Generate Key
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="p-6 border-b bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Events</p>
                  <p className="text-2xl font-bold">{securityMetrics.totalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Critical</p>
                  <p className="text-2xl font-bold">{securityMetrics.criticalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Resolved</p>
                  <p className="text-2xl font-bold">{securityMetrics.resolvedEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Active Keys</p>
                  <p className="text-2xl font-bold">{encryptionKeys.filter(k => k.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Expired Keys</p>
                  <p className="text-2xl font-bold">{encryptionKeys.filter(k => k.status === 'expired').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Risk Score</p>
                  <p className="text-2xl font-bold">{securityMetrics.avgRiskScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Compliance</p>
                  <p className="text-2xl font-bold">{securityMetrics.complianceScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Security Events</TabsTrigger>
            <TabsTrigger value="encryption">Encryption</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Critical Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Critical Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {securityEvents
                        .filter(e => e.severity === 'critical')
                        .slice(0, 10)
                        .map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedEvent(event)}
                          >
                            {getEventIcon(event.type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{event.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(event.timestamp?.toDate?.() || new Date(), { addSuffix: true })}
                              </p>
                            </div>
                            <Badge className={getSeverityColor(event.severity)}>
                              {event.severity}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Anomalies */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scan className="h-5 w-5 text-orange-600" />
                    Detected Anomalies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {anomalies.slice(0, 10).map((anomaly) => (
                        <div
                          key={anomaly.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          {getEventIcon(anomaly.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{anomaly.description}</p>
                            <p className="text-sm text-muted-foreground">
                              User: {anomaly.userName} • {anomaly.location?.city}
                            </p>
                          </div>
                          <Badge variant="destructive">Anomaly</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Active Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-blue-600" />
                  Active Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          notification.severity === 'critical' ? 'bg-red-100 text-red-600' :
                          notification.severity === 'error' ? 'bg-orange-100 text-orange-600' :
                          notification.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <BellRing className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeNotification(notification.id)}
                      >
                        Acknowledge
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Events Tab */}
          <TabsContent value="events" className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <DatePickerWithRange
                date={dateRange}
                setDate={setDateRange}
              />
            </div>

            {/* Events List */}
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <div className="space-y-1">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer border-l-4 ${
                          event.severity === 'critical' ? 'border-red-500' :
                          event.severity === 'high' ? 'border-orange-500' :
                          event.severity === 'medium' ? 'border-yellow-500' :
                          'border-green-500'
                        }`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className={`p-2 rounded-full ${getSeverityColor(event.severity)}`}>
                          {getEventIcon(event.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{event.description}</p>
                            {!event.resolved && (
                              <Badge variant="destructive" className="text-xs">Unresolved</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>User: {event.userName}</span>
                            <span>IP: {event.ipAddress}</span>
                            <span>Device: {event.deviceInfo?.type}</span>
                            {event.location && (
                              <span>Location: {event.location.city}, {event.location.country}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDistanceToNow(event.timestamp?.toDate?.() || new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Encryption Tab */}
          <TabsContent value="encryption" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Encryption Keys</h3>
              <Button onClick={generateNewKey}>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Key
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {encryptionKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          key.status === 'active' ? 'bg-green-100 text-green-600' :
                          key.status === 'expired' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          <Key className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{key.algorithm} ({key.keySize} bit)</p>
                          <p className="text-sm text-muted-foreground">
                            Purpose: {key.purpose} • Created: {formatDistanceToNow(key.createdAt?.toDate?.() || new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={
                          key.status === 'active' ? 'default' :
                          key.status === 'expired' ? 'destructive' :
                          'secondary'
                        }>
                          {key.status}
                        </Badge>
                        
                        {key.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rotateKey(key.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Rotate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would continue with similar structure... */}
        </Tabs>
      </div>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getEventIcon(selectedEvent.type)}
                Security Event Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Event Type</Label>
                  <p className="font-medium">{selectedEvent.type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Badge className={getSeverityColor(selectedEvent.severity)}>
                    {selectedEvent.severity}
                  </Badge>
                </div>
                <div>
                  <Label>User</Label>
                  <p className="font-medium">{selectedEvent.userName}</p>
                </div>
                <div>
                  <Label>Timestamp</Label>
                  <p className="font-medium">
                    {format(selectedEvent.timestamp?.toDate?.() || new Date(), 'PPpp')}
                  </p>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <p className="text-sm">{selectedEvent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>IP Address</Label>
                  <p className="font-mono text-sm">{selectedEvent.ipAddress}</p>
                </div>
                <div>
                  <Label>Device</Label>
                  <p className="text-sm">
                    {selectedEvent.deviceInfo?.type} • {selectedEvent.deviceInfo?.os} • {selectedEvent.deviceInfo?.browser}
                  </p>
                </div>
              </div>

              {selectedEvent.location && (
                <div>
                  <Label>Location</Label>
                  <p className="text-sm">
                    {selectedEvent.location.city}, {selectedEvent.location.region}, {selectedEvent.location.country}
                  </p>
                </div>
              )}

              {selectedEvent.details && (
                <div>
                  <Label>Additional Details</Label>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              )}

              {!selectedEvent.resolved && (
                <div className="space-y-2">
                  <Label>Resolution Notes</Label>
                  <Textarea
                    placeholder="Describe how this event was resolved..."
                    value={selectedEvent.resolutionNotes || ''}
                    onChange={(e) => setSelectedEvent({
                      ...selectedEvent,
                      resolutionNotes: e.target.value
                    })}
                  />
                  <Button 
                    onClick={() => resolveEvent(selectedEvent.id, selectedEvent.resolutionNotes || '')}
                    className="w-full"
                  >
                    Mark as Resolved
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}