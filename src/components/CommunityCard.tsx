import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { Users, BadgeCheck } from "lucide-react";

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  tag?: string;
  isJoined: boolean;
  isOwner: boolean;
  createdByInfluencer: boolean;
  imageUrl?: string;
}

interface CommunityCardProps {
  community: Community;
  onJoin?: (id: string) => void;
  onView?: (id: string) => void;
}

const formatMemberCount = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k members` : `${count} members`;

export const CommunityCard = ({ community, onJoin, onView }: CommunityCardProps) => (
  <StatsCard className="space-y-3">
    <div className="flex items-start gap-3">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {community.imageUrl ? (
          <img
            src={community.imageUrl}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Users className="w-6 h-6 text-primary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-foreground leading-tight">{community.name}</h3>
          {community.createdByInfluencer && (
            <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
          )}
          {community.tag && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
              {community.tag}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{community.description}</p>
      </div>
    </div>

    <div className="flex items-center justify-between pt-1">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        {formatMemberCount(community.memberCount)}
      </span>

      {community.isJoined ? (
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl h-8 px-4"
          onClick={() => onView?.(community.id)}
        >
          View
        </Button>
      ) : (
        <Button
          size="sm"
          className="rounded-xl h-8 px-4"
          onClick={() => onJoin?.(community.id)}
        >
          Join
        </Button>
      )}
    </div>
  </StatsCard>
);
