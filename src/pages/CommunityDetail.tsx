import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Users, BadgeCheck, TrendingUp, Star } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RankingRow {
  user_id:      string;
  display_name: string;
  avatar_url:   string | null;
  score:        number;
  rank:         number;
}

interface InsightsRow {
  avg_score:              number | null;
  active_members:         number | null;
  week_number:            number;
  current_challenge_name: string | null;
  challenge_percent:      number | null;
}

// ── Deterministic color from user_id ──────────────────────────────────────────

const PALETTE = ["#4ade80","#60a5fa","#f59e0b","#a78bfa","#f472b6","#34d399","#fb923c","#38bdf8"];

const colorFor = (userId: string) =>
  PALETTE[userId.charCodeAt(0) % PALETTE.length];

// ── Avatar circle ─────────────────────────────────────────────────────────────

const Avatar = ({ name, userId, size = 56 }: { name: string; userId: string; size?: number }) => {
  const color = colorFor(userId);
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: "50%",
        background: `${color}22`,
        border: `2px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: size * 0.35, fontWeight: 700, color }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

// ── Top-3 podium ──────────────────────────────────────────────────────────────

const Podium = ({ top3 }: { top3: RankingRow[] }) => {
  const second = top3[1];
  const first  = top3[0];
  const third  = top3[2];

  if (!first) return null;

  return (
    <div className="flex items-end justify-center gap-6 py-4">
      {second && (
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name={second.display_name} userId={second.user_id} size={52} />
          <span className="text-xs text-muted-foreground font-semibold">#2</span>
          <span className="text-sm font-semibold text-foreground">{second.display_name}</span>
          <span className="text-xs font-bold text-primary">{second.score} pts</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 -mt-4">
        <div className="relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <div className="w-6 h-6 rounded-full bg-orange-400 flex items-center justify-center">
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
          </div>
          <div className="w-[72px] h-[72px] rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">{first.display_name.charAt(0).toUpperCase()}</span>
          </div>
        </div>
        <span className="text-xs font-bold text-primary">#1</span>
        <span className="text-base font-bold text-foreground">{first.display_name}</span>
        <span className="text-sm font-bold text-primary">{first.score} pts</span>
      </div>

      {third && (
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name={third.display_name} userId={third.user_id} size={52} />
          <span className="text-xs text-muted-foreground font-semibold">#3</span>
          <span className="text-sm font-semibold text-foreground">{third.display_name}</span>
          <span className="text-xs font-bold text-primary">{third.score} pts</span>
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const CommunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Community info
  const { data: community, isLoading } = useQuery({
    queryKey: ["community", id],
    queryFn: async () => {
      const { data, error } = await db
        .from("communities_with_count")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as {
        id: string; owner_id: string; name: string; description: string;
        tag: string | null; image_url: string | null;
        is_influencer: boolean; member_count: number; is_joined: boolean;
      };
    },
    enabled: !!id && !!user?.id,
  });

  // Rankings
  const { data: rankings = [] } = useQuery<RankingRow[]>({
    queryKey: ["community_rankings", id],
    queryFn: async () => {
      const { data, error } = await db
        .from("community_rankings")
        .select("user_id, display_name, avatar_url, score, rank")
        .eq("community_id", id)
        .order("rank", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id && !!user?.id,
  });

  // Weekly insights
  const { data: insights } = useQuery<InsightsRow | null>({
    queryKey: ["community_insights", id],
    queryFn: async () => {
      const { data, error } = await db
        .from("community_weekly_insights")
        .select("*")
        .eq("community_id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data ?? null;
    },
    enabled: !!id && !!user?.id,
  });

  // Join / Leave
  const joinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("community_members")
        .insert({ community_id: id, user_id: user!.id, role: "member" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", id] });
      queryClient.invalidateQueries({ queryKey: ["communities", user?.id] });
      toast.success("Joined!");
    },
    onError: () => toast.error("Couldn't join. Try again."),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("community_members")
        .delete()
        .eq("community_id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", id] });
      queryClient.invalidateQueries({ queryKey: ["communities", user?.id] });
      toast.success("Left community.");
      navigate("/comunidad");
    },
    onError: () => toast.error("Couldn't leave. Try again."),
  });

  const formatCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k members` : `${n} members`;

  const isOwner   = community?.owner_id === user?.id;
  const top3      = rankings.slice(0, 3);
  const rest      = rankings.slice(3);
  const userRank  = rankings.find(r => r.user_id === user?.id);
  const weekLabel = insights ? `Week ${insights.week_number}` : "—";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-3xl bg-card animate-pulse" />
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <p className="text-muted-foreground">Community not found.</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-5">

        {/* Header bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/comunidad")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Community</h1>
          <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Community info card */}
        <StatsCard className="space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {community.image_url ? (
                <img src={community.image_url} alt={community.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/20 rounded-2xl">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-foreground leading-tight">{community.name}</h2>
                  {community.tag && (
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mt-0.5">
                      {community.tag}
                    </p>
                  )}
                </div>

                {!isOwner && (
                  community.is_joined ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-2xl h-9 px-4 text-sm border-foreground/30 gap-1.5 shrink-0"
                      onClick={() => leaveMutation.mutate()}
                      disabled={leaveMutation.isPending}
                    >
                      ✓ Joined
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-2xl h-9 px-4 text-sm shrink-0"
                      onClick={() => joinMutation.mutate()}
                      disabled={joinMutation.isPending}
                    >
                      Join
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{community.description}</p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {formatCount(community.member_count)}
            </span>
            {community.is_influencer && (
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                Verified Club
              </span>
            )}
          </div>
        </StatsCard>

        {/* Weekly Insights */}
        <StatsCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Weekly Insights</h3>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {weekLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-2xl p-3 space-y-0.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Avg Score</p>
              <p className="text-3xl font-bold text-primary">{insights?.avg_score ?? "—"}</p>
            </div>
            <div className="bg-secondary/50 rounded-2xl p-3 space-y-0.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Active Now</p>
              <p className="text-3xl font-bold text-foreground">{insights?.active_members ?? "—"}</p>
            </div>
          </div>

          {insights?.current_challenge_name ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">Current Challenge</span>
                <span className="font-bold text-primary text-sm">{insights.challenge_percent ?? 0}%</span>
              </div>
              <p className="text-sm font-semibold text-muted-foreground">{insights.current_challenge_name}</p>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${insights.challenge_percent ?? 0}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active challenge this week.</p>
          )}
        </StatsCard>

        {/* Global Rankings */}
        {rankings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Global Rankings</h3>
            </div>

            <StatsCard className="py-4">
              <Podium top3={top3} />
            </StatsCard>

            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map(member => (
                  <StatsCard key={member.user_id} className="py-4 px-5">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground font-bold w-4 text-sm">{member.rank}</span>
                      <Avatar name={member.display_name} userId={member.user_id} size={40} />
                      <span className="flex-1 font-semibold text-foreground text-sm">{member.display_name}</span>
                      <div className="text-right">
                        <p className="text-primary font-bold text-base leading-none">{member.score}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Score</p>
                      </div>
                    </div>
                  </StatsCard>
                ))}
              </div>
            )}

            {/* User's position */}
            {userRank && (
              <StatsCard className="py-4 px-5 border border-primary/30">
                <div className="flex items-center gap-4">
                  <span className="text-primary font-bold w-4 text-sm">{userRank.rank}</span>
                  <Avatar name={userRank.display_name} userId={userRank.user_id} size={40} />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{userRank.display_name} (You)</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Current Position</p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-bold text-base leading-none">{userRank.score}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Score</p>
                  </div>
                </div>
              </StatsCard>
            )}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
};

export default CommunityDetail;
