Rails.application.routes.draw do
  devise_for :users
  root 'restaurants#index'

  get 'restaurants/search', to: 'restaurants#search', as: 'restaurants_search'

  resources :restaurants, only: [:index, :show] do
    resources :reviews, only: [:create, :edit, :update, :destroy]
    post 'toggle_favorite', to: 'favorites#toggle'
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
end

