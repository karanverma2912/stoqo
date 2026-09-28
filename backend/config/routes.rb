Rails.application.routes.draw do
  get "up", to: "rails/health#show"
  namespace :api do
    namespace :v1 do
      post "auth/signup", to: "auth#signup"
      post "auth/login", to: "auth#login"
      get "auth/me", to: "auth#me"
      delete "auth/logout", to: "auth#logout"
      resources :businesses, only: [:index, :create, :update]
      resources :categories, only: [:index, :create]
      resources :products, only: [:index, :show, :create, :update] do
        collection { get :export }
        member { get :image }
      end
      resources :stock_movements, only: [:index, :create]
      get "dashboard", to: "dashboard#show"
      get "reports", to: "reports#index"
      get "activities", to: "activities#index"
      resources :imports, only: [:create, :show]
      resources :notifications, only: [:index, :update]
      get "team_members", to: "team_members#index"
      get "subscriptions", to: "subscriptions#index"
    end
  end
end
