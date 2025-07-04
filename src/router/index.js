import { createRouter, createWebHashHistory } from "vue-router"

const MapAnimate = () => import("@/views/map-animate/map.vue")
const TownMap = () => import("@/views/town-map-animate/town-map.vue")
const MapModuleTest = () => import("@/views/map-animate/map/modules/MapExample.vue")

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/three-3d-map",
      component: MapAnimate,
    },
    {
      path: "/three-3d-map",
      component: MapAnimate,
    },
    {
      path: "/town-map-animate",
      name: "TownMap",
      component: TownMap,
    },
    {
      path: "/town-map",
      redirect: "/town-map-animate",
    },
    {
      path: "/module-test",
      name: "MapModuleTest",
      component: MapModuleTest,
    },
    {
      path: "/:pathMatch(.*)",
      redirect: "/",
    },
  ],
})

export default router
