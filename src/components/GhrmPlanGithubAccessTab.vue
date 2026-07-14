<template>
  <div class="ghrm-github-access-tab">
    <div class="access-section">
      <h3 class="section-title">
        {{ $t('ghrm.membership.connectionTitle') }}
      </h3>
      <GhrmGithubConnectButton />
    </div>

    <div
      v-if="store.accessStatus && !store.accessStatus.connected"
      class="access-message access-message--info"
      data-testid="not-connected-message"
    >
      {{ $t('ghrm.membership.connectPrompt') }}
    </div>

    <div
      v-else-if="memberships.length"
      class="access-section"
    >
      <h3 class="section-title">
        {{ $t('ghrm.membership.title') }}
      </h3>

      <div
        v-for="membership in memberships"
        :key="membership.package_slug"
        class="membership-row"
        data-testid="membership-row"
      >
        <div class="membership-head">
          <span class="membership-name">{{ membership.package_name }}</span>
          <span
            class="chip"
            :class="`chip--${membership.status.toLowerCase()}`"
            :data-testid="`chip-${membership.status.toLowerCase()}`"
          >
            {{ chipLabel(membership.status) }}
          </span>
        </div>

        <!-- ACTIVE: connected + install panel (GitHub link + clone guidance) -->
        <template v-if="normalizedStatus(membership) === 'active'">
          <p class="membership-copy">
            {{ $t('ghrm.membership.activeLabel') }}
          </p>

          <!-- team-kind: the user is a team member — clone any team repo -->
          <div
            v-if="membership.team"
            class="install-panel"
            data-testid="install-panel"
          >
            <p class="install-intro">
              {{ $t('ghrm.membership.teamIntro', { team: membership.team.slug }) }}
            </p>
            <a
              class="github-link"
              data-testid="github-team-link"
              :href="membership.team.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ membership.team.org }}/{{ membership.team.slug }}
            </a>
          </div>

          <!-- repo-kind: one GitHub link + clone block per repo (single/bundle) -->
          <div
            v-else
            class="install-panel"
            data-testid="install-panel"
          >
            <p class="install-intro">
              {{ $t('ghrm.membership.patIntro') }}
            </p>
            <div
              v-for="repo in (membership.repos || [])"
              :key="`${repo.owner}/${repo.repo}`"
              class="repo-block"
              data-testid="repo-block"
            >
              <a
                class="github-link"
                data-testid="github-repo-link"
                :href="repo.github_url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ repo.owner }}/{{ repo.repo }}
              </a>
              <ol class="pat-steps">
                <li class="pat-step">
                  {{ $t('ghrm.membership.patStep1') }}
                </li>
                <li class="pat-step">
                  {{ $t('ghrm.membership.patStep2') }}
                </li>
                <li class="pat-step">
                  {{ $t('ghrm.membership.patStep3', { repo: `${repo.owner}/${repo.repo}` }) }}
                </li>
                <li class="pat-step">
                  {{ $t('ghrm.membership.patStep4') }}
                </li>
                <li class="pat-step">
                  {{ $t('ghrm.membership.patStep5') }}
                </li>
              </ol>
              <div class="clone-command">
                <span class="clone-label">{{ $t('ghrm.membership.cloneHttps') }}</span>
                <div class="clone-row">
                  <pre class="clone-pre"><code>{{ cloneHttps(repo) }}</code></pre>
                  <button
                    type="button"
                    class="copy-btn"
                    data-testid="copy-clone-https"
                    @click="copyCommand(cloneHttps(repo))"
                  >
                    {{ $t('ghrm.membership.copy') }}
                  </button>
                </div>
              </div>
              <div class="clone-command">
                <span class="clone-label">{{ $t('ghrm.membership.cloneSsh') }}</span>
                <div class="clone-row">
                  <pre class="clone-pre"><code>{{ cloneSsh(repo) }}</code></pre>
                  <button
                    type="button"
                    class="copy-btn"
                    data-testid="copy-clone-ssh"
                    @click="copyCommand(cloneSsh(repo))"
                  >
                    {{ $t('ghrm.membership.copy') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- INVITED: accept the invitation on GitHub -->
        <template v-else-if="normalizedStatus(membership) === 'invited'">
          <p class="membership-copy">
            {{ $t('ghrm.membership.invitedLabel') }}
          </p>
          <a
            v-if="invitationsUrl(membership)"
            class="invitation-link"
            data-testid="invitation-link"
            :href="invitationsUrl(membership)!"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ $t('ghrm.membership.acceptInvitation') }}
          </a>
        </template>

        <!-- GRACE: access ends on {date} -->
        <p
          v-else-if="normalizedStatus(membership) === 'grace'"
          class="membership-copy membership-copy--warning"
        >
          {{ $t('ghrm.membership.graceLabel', { date: membership.grace_expires_at }) }}
        </p>

        <!-- REVOKED: access ended, renew -->
        <p
          v-else-if="normalizedStatus(membership) === 'revoked'"
          class="membership-copy membership-copy--warning"
        >
          {{ $t('ghrm.membership.revokedLabel') }}
        </p>

        <!-- ERROR: never shows the connected/active affordance -->
        <p
          v-else
          class="membership-copy membership-copy--error"
        >
          {{ $t('ghrm.membership.errorLabel') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useGhrmStore } from '../stores/useGhrmStore';
import type { GhrmMembership, GhrmMembershipRepo, GhrmMembershipStatus } from '../api/ghrmApi';
import GhrmGithubConnectButton from './GhrmGithubConnectButton.vue';

defineProps<{ planSlug: string; planId: string }>();

const store = useGhrmStore();

const githubUsername = computed<string>(() => store.accessStatus?.github_username ?? '');

const memberships = computed<GhrmMembership[]>(() => {
  const status = store.accessStatus;
  if (!status?.connected) return [];
  return status.memberships ?? [];
});

// The backend serializes membership status as lowercase enum values
// ('active' | 'invited' | 'grace' | 'revoked' | 'error'). Normalize once so
// every branch compares against the same lowercase contract regardless of case.
function normalizedStatus(membership: GhrmMembership): string {
  return membership.status.toLowerCase();
}

function chipLabel(status: GhrmMembershipStatus): string {
  return status;
}

// Clone guidance is rendered directly from the membership's own ``repos`` +
// the connected ``github_username`` (no fragile per-package install fetch).
function cloneHttps(repo: GhrmMembershipRepo): string {
  return `git clone https://${githubUsername.value}:<PAT>@github.com/${repo.owner}/${repo.repo}.git`;
}

function cloneSsh(repo: GhrmMembershipRepo): string {
  return `git clone git@github.com:${repo.owner}/${repo.repo}.git`;
}

function invitationsUrl(membership: GhrmMembership): string | null {
  return membership.invitations_url ?? null;
}

onMounted(async () => {
  await store.fetchAccessStatus();
});

function copyCommand(command: string): void {
  navigator.clipboard.writeText(command).catch(() => {});
}
</script>

<style scoped>
.ghrm-github-access-tab { }
.access-section { margin-bottom: 28px; }
.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vbwd-text-heading, #2c3e50);
  margin: 0 0 12px;
}
.membership-row {
  padding: 16px;
  border: 1px solid var(--vbwd-border-color, #ddd);
  border-radius: 8px;
  margin-bottom: 16px;
  background: var(--vbwd-card-bg, #f8f9fa);
}
.membership-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.membership-name {
  font-weight: 600;
  color: var(--vbwd-text-heading, #2c3e50);
}
.chip {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.chip--active { background: var(--vbwd-color-success-soft, #d1fae5); color: var(--vbwd-color-success, #065f46); }
.chip--invited { background: var(--vbwd-color-info-soft, #dbeafe); color: var(--vbwd-color-info, #1e40af); }
.chip--grace { background: var(--vbwd-color-warning-soft, #fef3c7); color: var(--vbwd-color-warning, #92400e); }
.chip--revoked,
.chip--error { background: var(--vbwd-color-danger-soft, #fee2e2); color: var(--vbwd-color-danger, #991b1b); }
.membership-copy {
  color: var(--vbwd-text-body, #333);
  font-size: 14px;
  margin: 0 0 12px;
}
.membership-copy--warning { color: var(--vbwd-color-warning, #92400e); }
.membership-copy--error { color: var(--vbwd-color-danger, #991b1b); }
.access-message {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--vbwd-text-body, #333);
  background: var(--vbwd-card-bg, #f8f9fa);
  border: 1px solid var(--vbwd-border-color, #ddd);
}
.access-message--info { border-color: var(--vbwd-color-primary, #3498db); }
.invitation-link {
  display: inline-block;
  color: var(--vbwd-color-primary, #3498db);
  font-weight: 600;
  text-decoration: underline;
}
.install-panel { display: flex; flex-direction: column; gap: 16px; }
.install-intro { margin: 0; font-size: 14px; color: var(--vbwd-text-body, #333); }
.pat-steps { margin: 0; padding-left: 20px; color: var(--vbwd-text-body, #333); font-size: 14px; }
.pat-step { margin-bottom: 4px; }
.clone-command { }
.clone-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--vbwd-text-muted, #666);
  margin-bottom: 4px;
  display: block;
}
.clone-row { display: flex; align-items: stretch; gap: 8px; }
.clone-pre {
  flex: 1;
  background: var(--vbwd-code-bg, #1e1e1e);
  color: var(--vbwd-code-text, #d4d4d4);
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  overflow-x: auto;
  margin: 0;
}
.copy-btn {
  padding: 0 14px;
  background: var(--vbwd-color-primary, #3498db);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}
.copy-btn:hover { background: var(--vbwd-color-primary-hover, #2980b9); }
</style>
