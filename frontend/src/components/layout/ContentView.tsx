import { useUIStore, ViewType } from "@/store/uiStore";
import { TerminalStack } from "@/components/terminal/TerminalStack";
import { HostsPage } from "@/components/views/HostsPage.tsx";
import { KeysPage } from "@/components/views/KeysPage.tsx";
import { IdentitiesPage } from "@/components/views/IdentitiesPage.tsx";
import { SettingsPage } from "@/components/views/SettingsPage.tsx";
import { SnippetsPage } from "@/components/views/SnippetsPage.tsx";
import { SftpPage } from "@/components/views/SftpPage.tsx";

export function ContentView() {
    const {activeView} = useUIStore();

    return (
        <main className="relative flex min-h-0 flex-1 overflow-hidden bg-background">

            {activeView === ViewType.Hosts && <HostsPage/>}
            {activeView === ViewType.Keys && <KeysPage/>}
            {activeView === ViewType.Identities && <IdentitiesPage/>}
            {activeView === ViewType.Snippets && <SnippetsPage/>}
            {activeView === ViewType.Sftp && <SftpPage/>}
            {activeView === ViewType.Settings && <SettingsPage/>}

            <TerminalStack isVisible={activeView === ViewType.Terminal}/>

        </main>
    );
}