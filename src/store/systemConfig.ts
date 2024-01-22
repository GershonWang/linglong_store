import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSystemConfigStore = defineStore('systemConfig', {
    state: () => ({
        // 系统架构
        arch: ref('x86_64'),
        // 玲珑源地址
        sourceUrl: ref('https://mirror-repo-linglong.deepin.com'),
        // 是否过滤非当前架构程序
        filterFlag: ref(true),
        // 自动检测更新
        autoCheckUpdate: ref(true),
    }),
    getters: {
        getFilterFlag: (state) => state.filterFlag,
    },
    actions: {
        // 修改系统架构信息
        changeArch(inArch: string){
            const that = this;
            that.arch = inArch;
        },
        // 修改玲珑源地址
        changeSourceUrl(inSourceUrl: string){
            const that = this;
            that.sourceUrl = inSourceUrl;
        },
        // 修改过滤非当前架构程序
        changeFilterFlag(inFilterFlag: boolean){
            const that = this;
            that.filterFlag = inFilterFlag;
        },
        // 自动检测更新
        changeAutoCheckUpdate(autoCheckUpdate: boolean){
            const that = this;
            that.autoCheckUpdate = autoCheckUpdate;
        },
    },
    persist: true
})