<template>
    <suspense>
        <template #default>
            <router-view></router-view>
        </template>
        <template #fallback>
            <div>Loading...</div>
        </template>
    </suspense>
</template>
