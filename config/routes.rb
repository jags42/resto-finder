Rails.application.routes.draw do
  devise_for :users
  root 'dashboard#profile'

  get 'restaurants/search', to: 'restaurants#search', as: 'restaurants_search'

  resources :restaurants, only: [:index, :show] do
    resources :reviews, only: [:create, :edit, :update, :destroy]
    post 'toggle_favorite', to: 'favorites#toggle'
  end

  get 'profile', to: 'dashboard#profile', as: :dashboard_profile
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  get "up" => "rails/health#show", as: :rails_health_check

end

