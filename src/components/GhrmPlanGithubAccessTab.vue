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

        <!-- ACTIVE: connected + install panel (PAT steps + clone command) -->
        <template v-if="membership.status === 'ACTIVE'">
          <p class="membership-copy">
            {{ $t('ghrm.membership.activeLabel') }}
          </p>
          <div
            v-if="activeInstall(membership.package_slug)"
            class="install-panel"
            data-testid="install-panel"
          >
            <p class="install-intro">
              {{ $t('ghrm.membership.patIntro') }}
            </p>
            <ol class="pat-steps">
              <li
                v-for="(step, index) in activeInstall(membership.package_slug)!.pat_steps"
                :key="index"
                class="pat-step"
              >
                {{ step }}
              </li>
            </ol>
            <div class="clone-command">
              <span class="clone-label">{{ $t('ghrm.membership.cloneHttps') }}</span>
              <div class="clone-row">
                <pre class="clone-pre"><code>{{ activeInstall(membership.package_slug)!.clone_https }}</code></pre>
                <button
                  type="button"
                  class="copy-btn"
                  data-testid="copy-clone-https"
                  @click="copyCommand(activeInstall(membership.package_slug)!.clone_https)"
                >
                  {{ $t('ghrm.membership.copy') }}
                </button>
              </div>
            </div>
            <div class="clone-command">
              <span class="clone-label">{{ $t('ghrm.membership.cloneSsh') }}</span>
              <div class="clone-row">
                <pre class="clone-pre"><code>{{ activeInstall(membership.package_slug)!.clone_ssh }}</code></pre>
                <button
                  type="button"
                  class="copy-btn"
                  data-testid="copy-clone-ssh"
                  @click="copyCommand(activeInstall(membership.package_slug)!.clone_ssh)"
                >
                  {{ $t('ghrm.membership.copy') }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- INVITED: accept the invitation on GitHub -->
        <template v-else-if="membership.status === 'INVITED'">
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
          v-else-if="membership.status === 'GRACE'"
          class="membership-copy membership-copy--warning"
        >
          {{ $t('ghrm.membership.graceLabel', { date: membership.grace_expires_at }) }}
        </p>

        <!-- REVOKED: access ended, renew -->
        <p
          v-else-if="membership.status === 'REVOKED'"
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
import type { GhrmActiveInstall, GhrmMembership, GhrmMembershipStatus } from '../api/ghrmApi';
import GhrmGithubConnectButton from './GhrmGithubConnectButton.vue';

defineProps<{ planSlug: string; planId: string }>();

const store = useGhrmStore();

const memberships = computed<GhrmMembership[]>(() => {
  const status = store.accessStatus;
  if (!status?.connected) return [];
  return status.memberships ?? [];
});

function chipLabel(status: GhrmMembershipStatus): string {
  return status;
}

function activeInstall(slug: string): GhrmActiveInstall | null {
  const payload = store.installPayloads[slug];
  return payload && payload.state === 'active' ? payload : null;
}

function invitationsUrl(membership: GhrmMembership): string | null {
  return membership.invitations_url ?? null;
}

onMounted(async () => {
  await store.fetchAccessStatus();
  await Promise.all(
    memberships.value
      .filter((membership) => membership.status === 'ACTIVE')
      .map((membership) => store.fetchInstall(membership.package_slug)),
  );
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
