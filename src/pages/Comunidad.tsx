import { logger } from "@/lib/logger";
import { useState } from "react";
import { Search, Plus, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { StatsCard } from "@/components/StatsCard";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CommunityCard, type Community } from "@/components/CommunityCard";
import { CommunityIconSelector, getCommunityIcon, COMMUNITY_ICON_LIST } from "@/components/CommunityIconSelector";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// communities, community_members, communities_with_count are not yet in the generated
// Supabase types — cast per-query until `supabase gen types` is re-run after migrations.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untypedDb = (table: string) => (supabase as any).from(table);

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = "trending" | "influencers" | "joined";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "trending",    label: "Trending"     },
  { key: "influencers", label: "Influencers"  },
  { key: "joined",      label: "Joined"       },
];

interface CommunityRow {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  tag: string | null;
  icon: string | null;
  icon_color: string | null;
  image_url: string | null;
  is_influencer: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  member_count: number;
  is_joined: boolean;
}

function rowToCommunity(row: CommunityRow, userId: string): Community {
  return {
    id:                  row.id,
    name:                row.name,
    description:         row.description,
    memberCount:         row.member_count,
    tag:                 row.tag ?? undefined,
    icon:                row.icon ?? undefined,
    iconColor:           row.icon_color ?? undefined,
    isJoined:            row.is_joined,
    isOwner:             row.owner_id === userId,
    createdByInfluencer: row.is_influencer,
    imageUrl:            row.image_url ?? undefined,
  };
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  trending:    "No communities yet. Be the first to create one.",
  influencers: "No influencer communities available yet.",
  joined:      "You haven't joined any communities yet.",
};

interface EmptyStateProps {
  tab: FilterTab;
  canCreate: boolean;
  onCreateClick: () => void;
}

const EmptyState = ({ tab, canCreate, onCreateClick }: EmptyStateProps) => (
  <StatsCard className="flex flex-col items-center text-center py-12 gap-4">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
      <Users className="w-8 h-8 text-primary" />
    </div>
    <div className="space-y-1.5">
      <p className="font-semibold text-foreground">No communities yet</p>
      <p className="text-sm text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
        {EMPTY_MESSAGES[tab]}
      </p>
    </div>
    {tab === "trending" && canCreate && (
      <Button size="sm" className="rounded-xl gap-1.5 mt-1" onClick={onCreateClick}>
        <Plus className="w-4 h-4" />
        Create a Community
      </Button>
    )}
  </StatsCard>
);

// ─── Create community form ────────────────────────────────────────────────────

interface CreateCommunityFormProps {
  onClose: () => void;
  onCreated: () => void;
  userId: string;
}

const CreateCommunityForm = ({ onClose, onCreated, userId }: CreateCommunityFormProps) => {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag]                 = useState("");
  const [icon, setIcon]               = useState(COMMUNITY_ICON_LIST[0].id as string);
  const [iconColor, setIconColor]     = useState("#10B981");
  const [showIconPicker, setShowIconPicker] = useState(false);

  const IconComponent = getCommunityIcon(icon);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await untypedDb("communities")
        .insert({
          owner_id:    userId,
          name:        name.trim(),
          description: description.trim(),
          tag:         tag.trim() || null,
          icon,
          icon_color:  iconColor,
          is_public:   true,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: memberError } = await untypedDb("community_members")
        .insert({ community_id: data.id, user_id: userId, role: "owner" });
      if (memberError) throw memberError;
    },
    onSuccess: () => {
      toast.success("Community created!");
      onCreated();
      onClose();
    },
    onError: (err: any) => {
      if (err?.code === "23505") {
        toast.error("You already have a community.");
      } else {
        toast.error("Failed to create community. Try again.");
        logger.error(err);
      }
    },
  });

  return (
    <StatsCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Create a Community</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm transition-colors">✕</button>
      </div>

      <div className="space-y-3">
        {/* Icon picker */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setShowIconPicker(true)}
            className="w-24 h-24 rounded-3xl flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: `${iconColor}22`, border: `2px solid ${iconColor}44` }}
          >
            <IconComponent className="w-10 h-10" style={{ color: iconColor }} strokeWidth={1.5} />
          </button>
          <p className="text-xs text-muted-foreground">Toca para elegir icono</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
          <Input placeholder="My Fitness Community" value={name} onChange={e => setName(e.target.value.slice(0, 50))} className="rounded-xl" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Description</label>
          <textarea
            placeholder="What's this community about?"
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 200))}
            rows={3}
            className="w-full resize-none rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 outline-none border border-border focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tag (optional)</label>
          <Input placeholder="e.g. fitness, nutrition, weightlifting" value={tag} onChange={e => setTag(e.target.value.slice(0, 30))} className="rounded-xl" />
        </div>
      </div>

      <Button
        className="w-full rounded-xl"
        disabled={!name.trim() || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Creating..." : "Create Community"}
      </Button>

      <CommunityIconSelector
        open={showIconPicker}
        onOpenChange={setShowIconPicker}
        currentIcon={icon}
        currentColor={iconColor}
        onSelect={(i, c) => { setIcon(i); setIconColor(c); }}
      />
    </StatsCard>
  );
};

// ─── Main screen ─────────────────────────────────────────────────────────────

const Comunidad = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]         = useState<FilterTab>("trending");
  const [searchQuery, setSearchQuery]     = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // ── Fetch communities ──────────────────────────────────────────────────────
  const { data: rows = [], isLoading } = useQuery<CommunityRow[]>({
    queryKey: ["communities", user?.id],
    queryFn: async () => {
      const { data, error } = await untypedDb("communities_with_count")
        .select("*")
        .order("member_count", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // ── Check if user already owns a community ─────────────────────────────────
  const { data: ownedCommunity } = useQuery({
    queryKey: ["ownedCommunity", user?.id],
    queryFn: async () => {
      const { data } = await untypedDb("communities")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data as { id: string } | null;
    },
    enabled: !!user?.id,
  });

  const hasCreatedCommunity = !!ownedCommunity;

  // ── Join ───────────────────────────────────────────────────────────────────
  const joinMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const { error } = await untypedDb("community_members")
        .insert({ community_id: communityId, user_id: user!.id, role: "member" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities", user?.id] });
      toast.success("Joined!");
    },
    onError: () => toast.error("Couldn't join. Try again."),
  });


  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleJoin = (id: string) => joinMutation.mutate(id);

  const handleView = (id: string) => navigate(`/comunidad/${id}`);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const communities: Community[] = rows
    .filter(row => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q || row.name.toLowerCase().includes(q) || row.description.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (activeTab === "influencers") return row.is_influencer;
      if (activeTab === "joined")      return row.is_joined;
      return true; // trending = all
    })
    .map(row => rowToCommunity(row, user?.id ?? ""));

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Community</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Find your tribe. Train together.
            </p>
          </div>
          <Button
            size="sm"
            variant={hasCreatedCommunity ? "outline" : "default"}
            className="flex items-center gap-1.5 rounded-xl mt-1"
            onClick={() => !hasCreatedCommunity && setShowCreateForm(v => !v)}
            disabled={hasCreatedCommunity}
            title={hasCreatedCommunity ? "You already have a community" : "Create a community"}
          >
            <Plus className="w-4 h-4" />
            Create
          </Button>
        </div>

        {/* Create form */}
        {showCreateForm && user?.id && (
          <CreateCommunityForm
            userId={user.id}
            onClose={() => setShowCreateForm(false)}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ["communities", user.id] });
              queryClient.invalidateQueries({ queryKey: ["ownedCommunity", user.id] });
            }}
          />
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-11 rounded-2xl"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List / empty / loading */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-3xl bg-card animate-pulse" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <EmptyState
            tab={activeTab}
            canCreate={!hasCreatedCommunity}
            onCreateClick={() => setShowCreateForm(true)}
          />
        ) : (
          <div className="space-y-3">
            {communities.map(community => (
              <CommunityCard
                key={community.id}
                community={community}
                onJoin={handleJoin}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Comunidad;
