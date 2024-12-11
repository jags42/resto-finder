class CreateRestaurants < ActiveRecord::Migration[7.2]
  def change
    create_table :restaurants do |t|
      t.string :name
      t.string :address
      t.float :latitude
      t.float :longitude
      t.string :place_id
      t.integer :price_level
      t.string :cuisine
      t.string :photo
      t.float :ratings
      t.integer :reviews_count

      t.timestamps
    end
  end
end
