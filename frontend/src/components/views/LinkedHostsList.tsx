import { useTranslation } from "react-i18next";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import {
    formatHostLabel,
    type HostLink,
    type HostLinkRole,
} from "@/lib/hostLinks";
import { cn } from "@/lib/utils";

interface LinkedHostsListProps {
    links: HostLink[];
    className?: string;
}

function roleLabel(
    role: HostLinkRole,
    t: (key: string) => string,
): string {
    switch (role) {
        case "auth":
            return t("host_link_role_auth");
        case "auto_password":
            return t("host_link_role_auto_password");
        case "key":
            return t("host_link_role_key");
    }
}

function formatRoles(roles: HostLinkRole[], t: (key: string) => string): string {
    return roles.map((role) => roleLabel(role, t)).join(" · ");
}

export function LinkedHostsList({ links, className }: LinkedHostsListProps) {
    const { t } = useTranslation("common");

    if (links.length === 0) {
        return (
            <p className={cn("text-xs text-muted-foreground", className)}>
                {t("linked_hosts_none")}
            </p>
        );
    }

    return (
        <ul className={cn("flex flex-col gap-1.5", className)}>
            {links.map(({ host, roles }) => (
                <li
                    key={host.id}
                    className="flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1"
                >
                    <HostIconBadge
                        icon={host.icon}
                        color={host.color}
                        size="sm"
                        className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                            {formatHostLabel(host)}
                        </p>
                        {host.host && host.name ? (
                            <p className="truncate text-2xs text-muted-foreground">
                                {host.host}
                            </p>
                        ) : null}
                    </div>
                    {roles.length > 0 ? (
                        <span className="shrink-0 text-2xs text-muted-foreground">
                            {formatRoles(roles, t)}
                        </span>
                    ) : null}
                </li>
            ))}
        </ul>
    );
}
