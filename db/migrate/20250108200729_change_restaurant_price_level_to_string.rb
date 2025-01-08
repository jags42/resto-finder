class ChangeRestaurantPriceLevelToString < ActiveRecord::Migration[7.2]
  def change
    change_column :restaurants, :price_level, :string
  end
end
