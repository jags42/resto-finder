class ReviewsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_restaurant
  before_action :set_review, only: [:edit, :update, :destroy]

  def create
    @review = @restaurant.reviews.build(review_params)
    @review.user = current_user

    if @review.save
      @restaurant.update_ratings_data
      redirect_to @restaurant, notice: 'Review was successfully created.'
    else
      @reviews = @restaurant.reviews.includes(:user).order(created_at: :desc)
      render 'restaurants/show'
    end
  end

  def edit
    @reviews = @restaurant.reviews.includes(:user).order(created_at: :desc)
    render 'restaurants/show'
  end

  def update
    if @review.update(review_params)
      @restaurant.update_ratings_data
      redirect_to @restaurant, notice: 'Review was successfully updated.'
    else
      @reviews = @restaurant.reviews.includes(:user).order(created_at: :desc)
      render 'restaurants/show'
    end
  end

  def destroy
    @review.destroy
    @restaurant.update_ratings_data
    redirect_to @restaurant, notice: 'Review was successfully deleted.'
  end

  private

  def set_restaurant
    @restaurant = Restaurant.find(params[:restaurant_id])
  end

  def set_review
    @review = current_user.reviews.find(params[:id])
  end

  def review_params
    params.require(:review).permit(:rating, :comment)
  end
end

