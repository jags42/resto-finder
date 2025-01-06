class EnsureRestaurantPhotoColumns < ActiveRecord::Migration[7.2]
  def change
    change_column :restaurants, :photo, :string, limit: 2048
    change_column :restaurants, :photo_url, :string, limit: 2048
  end
end
