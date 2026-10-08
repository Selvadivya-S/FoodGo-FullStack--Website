import { Router } from "express";

import {
  listRestaurants,
  listCityMenu,
  listRestaurantLocations,
  getRestaurant,
  listMenu,
  listBranches,
} from "../controllers/restaurant.controller.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| PUBLIC RESTAURANT ROUTES
|--------------------------------------------------------------------------
| These routes are available without authentication.
*/

/*
|--------------------------------------------------------------------------
| Restaurant Locations
|--------------------------------------------------------------------------
| Support both:
|   /api/restaurants/location
|   /api/restaurants/locations
|
| The singular route is included because the frontend currently requests
| /restaurants/location.
|--------------------------------------------------------------------------
*/

router.get("/restaurants/location", listRestaurantLocations);

router.get("/restaurants/locations", listRestaurantLocations);


/*
|--------------------------------------------------------------------------
| Restaurant List
|--------------------------------------------------------------------------
*/

router.get("/restaurants", listRestaurants);


/*
|--------------------------------------------------------------------------
| City / Menu Listing
|--------------------------------------------------------------------------
*/

router.get("/restaurants/menus", listCityMenu);


/*
|--------------------------------------------------------------------------
| Restaurant Branches
|--------------------------------------------------------------------------
| Keep this before the generic :id route for clarity.
|--------------------------------------------------------------------------
*/

router.get("/restaurants/:id/branches", listBranches);


/*
|--------------------------------------------------------------------------
| Restaurant Menu
|--------------------------------------------------------------------------
*/

router.get("/restaurants/:restaurantId/menu", listMenu);


/*
|--------------------------------------------------------------------------
| Single Restaurant
|--------------------------------------------------------------------------
| This generic :id route comes after the specific routes above.
|
| This prevents "location" from being interpreted as a MongoDB ObjectId.
|--------------------------------------------------------------------------
*/

router.get("/restaurants/:id", getRestaurant);


export default router;