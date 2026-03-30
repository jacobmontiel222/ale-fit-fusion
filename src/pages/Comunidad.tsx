import { useState } from "react";
import { Search, Plus, Users } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CommunityCard, type Community } from "@/components/CommunityCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = "trending" | "influencers" | "friends";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "trending", label: "Trending" },
  { key: "influencers", label: "Influencers" },
  { key: "friends", label: "Friends" },
];

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  trending: "No communities yet. Be the first to create one.",
  influencers: "No influencer communities available yet.",
  friends: "Communities from people you follow will appear here.",
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

// ---------------------------------------------------------------------------
// Create Community placeholder (no backend yet)
// ---------------------------------------------------------------------------

const CreateCommunityPrompt = ({ onClose }: { onClose: () => void }) => (
  <StatsCard className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="font-semibold text-foreground">Create a Community</h2>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        ✕
      </button>
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Community creation will be available soon. Your community will be visible to all users and
      you can invite people to join.
    </p>
    <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
      Note: Each user can create only one community.
    </div>
    <Button className="w-full rounded-xl" disabled>
      Coming soon
    </Button>
  </StatsCard>
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

const Comunidad = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);

  // TODO: replace with Supabase query – e.g. supabase.from('communities').select(...)
  const communities: Community[] = [];

  // TODO: replace with Supabase check – has user already created a community?
  const hasCreatedCommunity = false;

  const filtered = communities.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activeTab === "influencers") return c.createdByInfluencer;
    // TODO: "friends" tab – filter by user's following list from Supabase
    if (activeTab === "friends") return false;
    return true; // trending shows all
  });

  // TODO: wire to Supabase mutation – supabase.from('community_members').insert(...)
  const handleJoin = (id: string) => {
    console.log("join community:", id);
  };

  // TODO: navigate to community detail screen
  const handleView = (id: string) => {
    console.log("view community:", id);
  };

  const handleCreateClick = () => {
    if (!hasCreatedCommunity) setShowCreatePrompt(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-5">

        {/* ── Header ───────────────────────────────────────────────────── */}
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
            onClick={handleCreateClick}
            disabled={hasCreatedCommunity}
            title={hasCreatedCommunity ? "You already have a community" : "Create a community"}
          >
            <Plus className="w-4 h-4" />
            Create
          </Button>
        </div>

        {/* ── Create prompt (inline, no modal yet) ─────────────────────── */}
        {showCreatePrompt && (
          <CreateCommunityPrompt onClose={() => setShowCreatePrompt(false)} />
        )}

        {/* ── Search ───────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 rounded-2xl"
          />
        </div>

        {/* ── Filter Tabs ──────────────────────────────────────────────── */}
        <div className="flex gap-2">
          {TABS.map((tab) => (
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

        {/* ── Community List / Empty State ─────────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState
            tab={activeTab}
            canCreate={!hasCreatedCommunity}
            onCreateClick={handleCreateClick}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((community) => (
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
