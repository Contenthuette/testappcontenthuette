import React from "react";
import { View, StyleSheet } from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  PlusCircle,
  X,
  XCircle,
  Check,
  CheckCircle,
  Search,
  SlidersHorizontal,
  Bell,
  BellDot,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Send,
  MoreHorizontal,
  Heart,
  Bookmark,
  Share,
  Camera,
  Image,
  Video,
  Mic,
  Phone,
  Calendar,
  Clock,
  MapPin,
  Map,
  Globe,
  Ticket,
  Sparkles,
  Users,
  UserCircle,
  User,
  Settings,
  Shield,
  Grid3X3,
  Layers,
  ArrowUp,
  ArrowUpCircle,
  SquarePen,
  QrCode,
  AlertTriangle,
  LogOut,
  Building2,
  Megaphone,
  Eye,
  EyeOff,
  Star,
  Lock,
  CreditCard,
  Trash2,
  Flag,
  Ban,
  ImageOff,
  FileText,
  HelpCircle,
  Info,
  Mail,
  Pencil,
  UserPlus,
  UserMinus,
  type LucideProps,
} from "lucide-react-native";

const iconMap: Record<string, React.FC<LucideProps>> = {
  // Navigation
  "chevron.left": ChevronLeft,
  "chevron.right": ChevronRight,
  "chevron.down": ChevronDown,
  "arrow.up": ArrowUp,
  "arrow.up.circle.fill": ArrowUpCircle,

  // Actions
  plus: Plus,
  "plus.circle.fill": PlusCircle,
  xmark: X,
  "xmark.circle.fill": XCircle,
  checkmark: Check,
  "checkmark.circle.fill": CheckCircle,
  ellipsis: MoreHorizontal,
  "square.and.arrow.up": Share,
  "square.and.pencil": SquarePen,
  "rectangle.portrait.and.arrow.right": LogOut,

  // Search & Filter
  magnifyingglass: Search,
  "slider.horizontal.3": SlidersHorizontal,
  "line.3.horizontal.decrease": SlidersHorizontal,

  // Communication
  bell: Bell,
  "bell.badge": BellDot,
  "bubble.right": MessageCircle,
  "bubble.left.and.bubble.right": MessagesSquare,
  paperplane: Send,
  mic: Mic,
  phone: Phone,

  // Content
  heart: Heart,
  "heart.fill": Heart,
  bookmark: Bookmark,
  "bookmark.fill": Bookmark,
  "text.quote": FileText,
  "megaphone.fill": Megaphone,
  star: Star,
  "star.fill": Star,
  flag: Flag,
  "flag.fill": Flag,

  // Media
  camera: Camera,
  "camera.fill": Camera,
  photo: Image,
  "photo.on.rectangle.angled": Image,
  video: Video,
  qrcode: QrCode,
  "square.grid.3x3": Grid3X3,

  // People
  "person.circle": UserCircle,
  "person.2": Users,
  "person.3": Users,
  "person.3.fill": Users,
  person: User,
  "person.fill": User,
  "person.badge.plus": UserPlus,
  "person.badge.minus": UserMinus,

  // Places & Time
  calendar: Calendar,
  clock: Clock,
  mappin: MapPin,
  "mappin.and.ellipse": MapPin,
  map: Map,
  globe: Globe,
  ticket: Ticket,
  sparkles: Sparkles,

  // Settings & Security
  gearshape: Settings,
  "shield.checkered": Shield,
  lock: Lock,
  "lock.fill": Lock,
  eye: Eye,
  "eye.slash": EyeOff,

  // Buildings & Places
  "building.2": Building2,
  "building.2.fill": Building2,

  // Misc
  "rectangle.stack": Layers,
  "creditcard": CreditCard,
  trash: Trash2,
  "trash.fill": Trash2,
  "nosign": Ban,
  "photo.fill": Image,
  "doc.text": FileText,
  "questionmark.circle": HelpCircle,
  "info.circle": Info,
  "exclamationmark.triangle.fill": AlertTriangle,
  "envelope": Mail,
  "pencil": Pencil,
};

interface SymbolViewProps {
  name: string;
  size?: number;
  tintColor?: string;
  weight?: "ultraLight" | "thin" | "light" | "regular" | "medium" | "semibold" | "bold" | "heavy" | "black";
  style?: object;
}

export function SymbolView({
  name,
  size = 20,
  tintColor = "#000000",
  weight,
  style,
}: SymbolViewProps) {
  const LucideIcon = iconMap[name];

  if (!LucideIcon) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: tintColor + "20",
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      />
    );
  }

  const isFilled = name.includes(".fill");
  let strokeWidth = 1.8;
  if (weight === "bold" || weight === "heavy" || weight === "black") {
    strokeWidth = 2.5;
  } else if (weight === "semibold" || weight === "medium") {
    strokeWidth = 2.2;
  } else if (weight === "light" || weight === "thin" || weight === "ultraLight") {
    strokeWidth = 1.2;
  }

  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <LucideIcon
        size={size * 0.9}
        color={tintColor}
        strokeWidth={strokeWidth}
        fill={isFilled ? tintColor : "none"}
      />
    </View>
  );
}

export default SymbolView;
