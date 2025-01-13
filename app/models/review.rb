class Review < ApplicationRecord
  belongs_to :user
  belongs_to :restaurant

  validates :rating, presence: true, inclusion: { in: 1..5 }
  validates :comment, presence: true
  validates :user_id, uniqueness: { scope: :restaurant_id, message: "You have already reviewed this restaurant" }

  after_save :update_restaurant_ratings
  after_destroy :update_restaurant_ratings

  private

  def update_restaurant_ratings
    restaurant.update_ratings_data
  end
end

