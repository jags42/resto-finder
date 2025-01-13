class Restaurant < ApplicationRecord
    has_many :reviews
    has_many :favorites
    has_many :users, through: :favorites
  
    validates :price_level, inclusion: { in: %w[Free Inexpensive Moderate Expensive Very\ Expensive Unknown], allow_nil: true }
  
    def average_rating
      reviews.average(:rating).to_f.round(1)
    end
  
    def update_ratings_data
      update(
        ratings: average_rating,
        reviews_count: reviews.count
      )
    end
  
    def as_json(options = {})
      super(options.merge(
        methods: [:average_rating],
        include: { reviews: { only: [:id, :rating, :comment, :created_at], include: { user: { only: [:id, :email] } } } }
      ))
    end
  end
  
  