import { createRouter, createWebHashHistory } from "vue-router"

const MapAnimate = () => import("@/views/map-animate/map.vue")
const TownMap = () => import("@/views/town-map-animate/town-map/TestOriginCode/test_town-map.vue")
const MapModuleTest = () => import("@/views/map-animate/map/modules/MapExample.vue")
const TownMapModular = () => import("@/views/town-map-animate/town-map/TownMapModular.vue")

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/three-3d-map",//默认
      component: MapAnimate,
    },
    {
      path: "/three-3d-map",//3D地图
      component: MapAnimate,
    },
    {
      path: "/town-map-animate",//村镇地图动画
      name: "TownMap",
      component: TownMap,
    },
    {
      path: "/town-map",//村镇地图
      redirect: "/town-map-animate",
    },
    {
      path: "/module-test",
      name: "MapModuleTest",//模块测试
      component: MapModuleTest,
    },
    {
      path: "/town-map-modular",
      name: "TownMapModular",//村镇地图模块化
      component: TownMapModular,
    },
    {
      path: "/:pathMatch(.*)",//重定向
      redirect: "/",
    },
  ],
})

export default router
