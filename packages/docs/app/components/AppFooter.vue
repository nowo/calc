<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
    <UFooter>
        <template #left>
            <p class="text-sm text-muted">
                MIT License · © {{ year }} @wzo/calc
            </p>
        </template>

        <template #right>
            <UButton icon="i-simple-icons-github"
                color="neutral"
                variant="ghost"
                to="https://github.com/nowo/calc"
                target="_blank"
                aria-label="GitHub" />
        </template>
    </UFooter>
</template>
