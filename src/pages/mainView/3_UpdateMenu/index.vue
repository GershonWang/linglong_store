<template>
    <div class="container" v-loading="loading" element-loading-text="加载中...">
        <div class="card_container" v-if="updateItemsStore.updateItemList && updateItemsStore.updateItemList.length > 0">
            <div class="card_items" v-for="(item, index) in updateItemsStore.updateItemList" :key="index">
                <updateCard :name="item.name" :version="item.version" :description="item.description" :arch="item.arch"
                    :isInstalled="true" :appId="item.appId" :icon="item.icon" :loading="item.loading" />
            </div>
        </div>
        <div class="noDataContainer" v-else>
            <div class="imageDiv">
                <img class="image" :src="defaultImage" alt="Image" />
            </div>
            <h1>暂无数据</h1>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ipcRenderer } from "electron";
import { ElNotification } from 'element-plus';
import { CardFace } from "@/interface/CardFace";
import { InstalledEntity } from "@/interface/InstalledEntity";
import updateCard from "@/components/updateCard.vue";
import string2card from "@/util/string2card";
import hasUpdateVersion from "@/util/checkVersion";
import defaultImage from '@/assets/logo.svg';
import { useAllServItemsStore } from "@/store/allServItems";
import { useInstalledItemsStore } from "@/store/installedItems";
import { useUpdateItemsStore } from "@/store/updateItems";
import { useSystemConfigStore } from "@/store/systemConfig";

const allServItemsStore = useAllServItemsStore();
const installedItemsStore = useInstalledItemsStore();
const updateItemsStore = useUpdateItemsStore();
const systemConfig = useSystemConfigStore();
// 页面加载状态
const loading = ref(true);
// 记录循环次数的标记值
let currentIndex = 0;
// 嵌套循环获取所有已安装的玲珑程序是否有更新版本
const searchLingLongHasUpdate = (uniqueInstalledSet: InstalledEntity[]) => {
    if (currentIndex < uniqueInstalledSet.length) {
        const item = uniqueInstalledSet[currentIndex];
        const { appId, version } = item;
        if (hasUpdateVersion('1.3.99', systemConfig.llVersion) == 1) {
            ipcRenderer.send("command", { command: `ll-cli search ${appId} --json`, appId: appId, version: version });
        } else {
            ipcRenderer.send("command", { command: `ll-cli query ${appId}`, appId: appId, version: version });
        }
        ipcRenderer.once('command-result', (_event: any, res: any) => {
            const command: string = res.param.command;
            if (command.startsWith('ll-cli query') || command.startsWith('ll-cli search')) {
                // 返回异常判定为网络异常
                if ('stdout' != res.code) {
                    systemConfig.changeNetworkRunStatus(false);
                    return;
                }
                const appId: string = res.param.appId;
                const result: string = res.result;
                // 用于存放不同版本的玲珑集合
                let searchVersionItemList: InstalledEntity[] = [];
                // 1.4版本以前的命令
                if (command.startsWith('ll-cli query')) {
                    const apps: string[] = result.split('\n');
                    if (apps.length > 2) {
                        for (let index = 2; index < apps.length - 1; index++) {
                            const card: CardFace | null = string2card(apps[index]);
                            if (card && appId == card.appId && item.module != 'devel') {
                                searchVersionItemList.push(card as InstalledEntity);
                            }
                        }
                    }
                }
                // 1.4版本以后的命令
                if (command.startsWith('ll-cli search')) {
                    searchVersionItemList = result.trim() ? JSON.parse(result.trim()) : [];
                    if (searchVersionItemList.length > 0) {
                        // 过滤不同appId和时devel的数据
                        searchVersionItemList = searchVersionItemList.filter(item => item && item.appId == appId && item.module != 'devel');
                    }
                }
                // 当版本数组数量大于2时才进行比较
                if (searchVersionItemList.length > 1) {
                    // 版本号从大到小排序
                    searchVersionItemList = searchVersionItemList.sort((a, b) => hasUpdateVersion(a.version, b.version));
                    const entity: InstalledEntity = searchVersionItemList[0];
                    if (hasUpdateVersion(res.param.version, entity.version) == 1) {
                        // 从所有程序列表中捞取程序图标icon
                        const allServItemList = allServItemsStore.allServItemList;
                        if (allServItemList && allServItemList.length > 0) {
                            const findItem = allServItemList.find(it => it.appId == appId);
                            entity.icon = findItem ? (findItem.icon ? findItem.icon : '') : '';
                        }
                        updateItemsStore.addItem(entity);
                    }
                }
                // 执行下一个循环
                currentIndex++;
                searchLingLongHasUpdate(uniqueInstalledSet);
            }
        });
    } else {
        // 查询结束，标记值归零并且停止加载
        currentIndex = 0;
        loading.value = false;
    }
}
// 页面打开时执行
onMounted(() => {
    updateItemsStore.clearItems(); // 清空页面列表数据
    // 检查网络状态
    if (!systemConfig.networkRunStatus) {
        loading.value = false;
        ElNotification({
            title: '提示',
            message: "网络状态不可用！请检查网络后,再重启商店使用...",
            type: 'error',
            duration: 5000,
        });
        return;
    }
    const installedItemList: InstalledEntity[] = installedItemsStore.installedItemList;
    // 初始化一个数组用于存储去重后当前已安装程序列表
    const uniqueInstalledSet: InstalledEntity[] = [];
    installedItemList.forEach((installedItem) => {
        const { appId, version } = installedItem;
        if (appId != 'org.deepin.Runtime' && appId != 'org.deepin.basics' 
            && appId != 'org.deepin.Wine' && appId != 'org.deepin.base' && appId != 'org.deepin.Bootstrap') {
            if (uniqueInstalledSet.some((item) => item.appId == appId)) {
                const item = uniqueInstalledSet.find((item) => item.appId == appId);
                if (item && hasUpdateVersion(item.version, version) == 1) {
                    const index = uniqueInstalledSet.findIndex((item) => item.appId == appId);
                    uniqueInstalledSet.splice(index, 1);
                }
            }
            uniqueInstalledSet.push(installedItem);
        }
    })
    // 查找是否含有高级版本
    searchLingLongHasUpdate(uniqueInstalledSet);
});
</script>
<style scoped>
.container {
    height: 100%;
    overflow-y: auto;
}

.card_container {
    display: grid;
    grid-gap: 10px;
    margin-right: 12px;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.card_items {
    padding: 10px;
    flex: 1;
    min-width: 180px;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-sizing: border-box;
    background-color: #999999;
}

.noDataContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
}

.imageDiv {
    width: 180px;
    height: 300px
}
</style>